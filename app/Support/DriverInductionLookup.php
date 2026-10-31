<?php

namespace App\Support;

use App\Models\InductionAttendee;
use App\Models\Unit;
use Illuminate\Support\Collection;

final class DriverInductionLookup
{
    public const MAX_DNIS = 400;

    /**
     * @return array{rows: list<array<string, mixed>>, summary: array<string, int>, truncated: bool, dni_count: int}
     */
    public function build(string $raw): array
    {
        $parsed = $this->parse($raw);
        $keys = array_slice($parsed, 0, self::MAX_DNIS);
        $truncated = count($parsed) > self::MAX_DNIS;

        if ($keys === []) {
            return [
                'rows' => [],
                'summary' => $this->emptySummary(),
                'truncated' => false,
                'dni_count' => 0,
            ];
        }

        $lookup = array_column($keys, 'key');
        $attendees = $this->attendees($lookup);
        $units = $this->units($lookup);
        $grouped = $attendees->groupBy(
            fn (InductionAttendee $attendee) => InductionDocumentPackage::digits($attendee->driver_dni),
        );

        $rows = [];

        foreach ($keys as $dni) {
            $rows[] = $this->row(
                $dni,
                $grouped->get($dni['key'], collect()),
                $units->get($dni['key']),
            );
        }

        $rows = $this->withMissing($rows);

        return [
            'rows' => $rows,
            'summary' => $this->summary($rows),
            'truncated' => $truncated,
            'dni_count' => count($rows),
        ];
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    public function parse(string $raw): array
    {
        $raw = str_replace(["\r\n", "\r", "\t", ';'], ["\n", "\n", "\n", ','], $raw);
        $seen = [];
        $dnis = [];

        foreach (preg_split('/[\n,]+/u', $raw) ?: [] as $chunk) {
            foreach (preg_split('/\s+/u', trim($chunk)) ?: [] as $token) {
                $key = InductionDocumentPackage::digits($token);

                if (strlen($key) < 6 || isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;
                $dnis[] = [
                    'key' => $key,
                    'label' => $token,
                ];
            }
        }

        return $dnis;
    }

    /**
     * @param  list<string>  $keys
     * @return Collection<int, InductionAttendee>
     */
    private function attendees(array $keys): Collection
    {
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));

        return InductionAttendee::query()
            ->with([
                'induction:id,title,induction_type,status,activity,session_date,scheduled_at,acta_number,location,sede',
            ])
            ->whereRaw("regexp_replace(driver_dni, '[^0-9]', '', 'g') in ({$placeholders})", $keys)
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  list<string>  $keys
     * @return Collection<string, Unit>
     */
    private function units(array $keys): Collection
    {
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));

        return Unit::query()
            ->whereNotNull('driver_dni')
            ->whereRaw("regexp_replace(driver_dni, '[^0-9]', '', 'g') in ({$placeholders})", $keys)
            ->orderByDesc('id')
            ->get(['id', 'driver_name', 'driver_dni', 'plate_number', 'provider', 'status'])
            ->unique(fn (Unit $unit) => InductionDocumentPackage::digits($unit->driver_dni))
            ->keyBy(fn (Unit $unit) => InductionDocumentPackage::digits($unit->driver_dni));
    }

    /**
     * @param  array{key: string, label: string}  $dni
     * @param  Collection<int, InductionAttendee>  $attendees
     * @return array<string, mixed>
     */
    private function row(array $dni, Collection $attendees, ?Unit $unit): array
    {
        $first = $attendees->first();
        $inductions = [];
        $seen = [];

        foreach ($attendees as $attendee) {
            $induction = $attendee->induction;

            if ($induction === null || isset($seen[$induction->id])) {
                continue;
            }

            $seen[$induction->id] = true;
            $date = $induction->session_date
                ?? $induction->scheduled_at?->timezone(config('app.timezone'));
            $activity = (string) ($induction->activity ?: '');

            $typeSlug = trim((string) ($induction->induction_type ?? ''));
            $typeTitle = $typeSlug !== '' && InductionTypeCatalog::exists($typeSlug)
                ? InductionTypeCatalog::title($typeSlug)
                : (string) $induction->title;

            $inductions[] = [
                'id' => $induction->id,
                'attendee_id' => $attendee->id,
                'title' => $typeTitle,
                'induction_type' => $typeSlug !== '' ? $typeSlug : null,
                'activity' => $activity,
                'activity_label' => InductionFormOptions::activities()[$activity] ?? $activity,
                'acta' => $induction->acta_number ?: '',
                'date' => $date?->format('d/m/Y') ?? '',
                'date_iso' => $date?->format('Y-m-d') ?? '',
                'status' => InductionStatuses::label((string) $induction->status),
                'status_key' => (string) $induction->status,
                'attendance' => InductionAttendeeStatuses::label((string) $attendee->status),
                'signed' => $attendee->isSigned(),
                'location' => $induction->location ?: ($induction->sede ?: ''),
                'closed' => $induction->status === InductionStatuses::CLOSED,
                'allows_receipts' => $activity === 'induccion',
            ];
        }

        $found = $first !== null || $unit !== null;

        return [
            'key' => $dni['key'],
            'dni' => $first?->driver_dni ?: ($unit?->driver_dni ?: $dni['label']),
            'found' => $found && $inductions !== [],
            'driver_name' => $first?->driver_name ?: ($unit?->driver_name ?: ''),
            'provider' => $first?->provider ?: ($unit?->provider ?: ''),
            'plate' => $first?->plate_number ?: ($unit?->plate_number ?: ''),
            'inductions' => $inductions,
            'missing' => [],
            'badges' => $this->badges($inductions, $found && $inductions !== [], []),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function withMissing(array $rows): array
    {
        $typeCatalog = collect($rows)
            ->flatMap(fn (array $row) => collect($row['inductions'])->map(function (array $induction) {
                $slug = trim((string) ($induction['induction_type'] ?? ''));

                if ($slug !== '' && InductionTypeCatalog::exists($slug)) {
                    return $slug;
                }

                return InductionTypeCatalog::resolveFromTitle((string) ($induction['title'] ?? ''))
                    ?? mb_strtolower(trim((string) ($induction['title'] ?? '')));
            }))
            ->filter()
            ->unique()
            ->values();

        foreach ($rows as $index => $row) {
            $haveTypes = collect($row['inductions'])->map(function (array $induction) {
                $slug = trim((string) ($induction['induction_type'] ?? ''));

                if ($slug !== '' && InductionTypeCatalog::exists($slug)) {
                    return $slug;
                }

                return InductionTypeCatalog::resolveFromTitle((string) ($induction['title'] ?? ''))
                    ?? mb_strtolower(trim((string) ($induction['title'] ?? '')));
            })->filter();

            $missing = $typeCatalog
                ->reject(fn (string $type) => $haveTypes->contains($type))
                ->map(fn (string $type) => InductionTypeCatalog::exists($type)
                    ? InductionTypeCatalog::title($type)
                    : $type)
                ->unique()
                ->values()
                ->all();

            $rows[$index]['missing'] = $missing;
            $rows[$index]['badges'] = $this->badges(
                $row['inductions'],
                (bool) $row['found'],
                $missing,
            );
        }

        return $rows;
    }

    /**
     * @param  list<array<string, mixed>>  $inductions
     * @param  list<string>  $missing
     * @return list<array{label: string, tone: string}>
     */
    private function badges(array $inductions, bool $found, array $missing): array
    {
        if (! $found) {
            $badges = [['label' => 'Sin actividades', 'tone' => 'muted']];

            foreach (array_slice($missing, 0, 3) as $label) {
                $badges[] = ['label' => 'Falta '.$label, 'tone' => 'bad'];
            }

            return $badges;
        }

        $count = count($inductions);
        $signed = collect($inductions)->where('signed', true)->count();
        $activities = collect($inductions)
            ->pluck('activity_label')
            ->filter()
            ->unique()
            ->values();

        $badges = [
            [
                'label' => $count === 1 ? '1 actividad' : "{$count} actividades",
                'tone' => 'info',
            ],
            [
                'label' => $signed === $count ? 'Firmadas' : "{$signed}/{$count} firmadas",
                'tone' => $signed === $count ? 'ok' : 'warn',
            ],
        ];

        foreach ($activities as $label) {
            $badges[] = ['label' => (string) $label, 'tone' => 'info'];
        }

        if ($missing !== []) {
            $preview = array_slice($missing, 0, 2);
            $extra = count($missing) - count($preview);
            $badges[] = [
                'label' => 'Falta '.implode(', ', $preview).($extra > 0 ? ' +'.$extra : ''),
                'tone' => 'bad',
            ];
        }

        return $badges;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int>
     */
    private function summary(array $rows): array
    {
        $summary = $this->emptySummary();
        $summary['consulted'] = count($rows);

        foreach ($rows as $row) {
            if (($row['missing'] ?? []) !== []) {
                $summary['lacking']++;
            }

            if (! $row['found']) {
                $summary['missing']++;

                continue;
            }

            $summary['found']++;
            $summary['activities'] += count($row['inductions']);
            $unsigned = collect($row['inductions'])->where('signed', false)->count();

            if ($unsigned > 0) {
                $summary['unsigned']++;
            }
        }

        return $summary;
    }

    /**
     * @return array<string, int>
     */
    private function emptySummary(): array
    {
        return [
            'consulted' => 0,
            'found' => 0,
            'missing' => 0,
            'activities' => 0,
            'unsigned' => 0,
            'lacking' => 0,
        ];
    }
}
