<?php

namespace App\Support;

use App\Models\ChecklistItem;
use App\Models\InductionAttendee;
use App\Models\Unit;
use App\Models\UnitChecklist;
use Illuminate\Support\Collection;

final class PlateReportBuilder
{
    public const MAX_PLATES = 400;

    /**
     * @return array{rows: list<array<string, mixed>>, summary: array<string, int>, truncated: bool, plate_count: int}
     */
    public function build(string $raw): array
    {
        $parsed = $this->parse($raw);
        $keys = array_slice($parsed, 0, self::MAX_PLATES);
        $truncated = count($parsed) > self::MAX_PLATES;

        if ($keys === []) {
            return [
                'rows' => [],
                'summary' => $this->emptySummary(),
                'truncated' => false,
                'plate_count' => 0,
            ];
        }

        $lookup = array_column($keys, 'key');
        $units = $this->units($lookup);
        $checklists = $this->checklists($lookup);
        $dnis = $units
            ->flatMap(fn (Collection $group) => $group->pluck('driver_dni'))
            ->map(fn ($dni) => $this->digits($dni))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $attendees = $this->attendees($lookup, $dnis);

        $rows = [];

        foreach ($keys as $plate) {
            $rows[] = $this->row(
                $plate,
                $units->get($plate['key'], collect()),
                $checklists->get($plate['key'], collect()),
                $attendees,
            );
        }

        return [
            'rows' => $rows,
            'summary' => $this->summary($rows),
            'truncated' => $truncated,
            'plate_count' => count($rows),
        ];
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    public function parse(string $raw): array
    {
        $raw = str_replace(["\r\n", "\r", "\t", ';'], ["\n", "\n", "\n", ','], $raw);
        $seen = [];
        $plates = [];

        foreach (preg_split('/[\n,]+/u', $raw) ?: [] as $chunk) {
            foreach (preg_split('/\s+/u', trim($chunk)) ?: [] as $token) {
                $token = trim($token);
                $key = $this->plateKey($token);

                if ($key === '' || isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;
                $plates[] = [
                    'key' => $key,
                    'label' => mb_strtoupper($token),
                ];
            }
        }

        return $plates;
    }

    /**
     * @param  list<string>  $keys
     * @return Collection<string, Collection<int, Unit>>
     */
    private function units(array $keys): Collection
    {
        return Unit::query()
            ->with([
                'documents:id,unit_id,type,expires_at',
                'period:id,name',
                'coordinatorUser:id,name',
            ])
            ->whereNotNull('plate_number')
            ->whereRaw($this->plateSql('plate_number', $keys), $keys)
            ->get([
                'id',
                'period_id',
                'coordinator_id',
                'correlative',
                'provider',
                'driver_name',
                'driver_dni',
                'plate_number',
                'status',
            ])
            ->groupBy(fn (Unit $unit) => $this->plateKey($unit->plate_number));
    }

    /**
     * @param  list<string>  $keys
     * @return Collection<string, Collection<int, UnitChecklist>>
     */
    private function checklists(array $keys): Collection
    {
        return UnitChecklist::query()
            ->with([
                'period:id,name',
                'creator:id,name',
                'answers' => fn ($query) => $query
                    ->where(function ($builder) {
                        $builder->where('first_value', 'no')->orWhere('second_value', 'no');
                    })
                    ->with('item.parent:id,item_number,label'),
            ])
            ->whereRaw($this->plateSql('plate_number', $keys), $keys)
            ->orderByDesc('id')
            ->get()
            ->groupBy(fn (UnitChecklist $checklist) => $this->plateKey($checklist->plate_number));
    }

    /**
     * @param  list<string>  $keys
     * @param  list<string>  $dnis
     * @return Collection<int, InductionAttendee>
     */
    private function attendees(array $keys, array $dnis): Collection
    {
        return InductionAttendee::query()
            ->with('induction:id,title,status,session_date,scheduled_at,acta_number')
            ->where(function ($query) use ($keys, $dnis) {
                $query->whereRaw($this->plateSql('plate_number', $keys), $keys);

                if ($dnis !== []) {
                    $query->orWhereRaw($this->digitsSql('driver_dni', $dnis), $dnis);
                }
            })
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array{key: string, label: string}  $plate
     * @param  Collection<int, Unit>  $units
     * @param  Collection<int, UnitChecklist>  $checklists
     * @param  Collection<int, InductionAttendee>  $attendees
     * @return array<string, mixed>
     */
    private function row(array $plate, Collection $units, Collection $checklists, Collection $attendees): array
    {
        $unit = $this->preferredUnit($units);
        $dni = $this->digits($unit?->driver_dni);
        $inspections = $checklists
            ->map(fn (UnitChecklist $checklist) => $this->inspection($checklist))
            ->values()
            ->all();
        $latest = $inspections[0] ?? null;
        $documents = $this->documents($unit);
        $inductions = $this->inductions($attendees, $plate['key'], $dni);
        $found = $unit !== null || $inspections !== [] || $inductions !== [];

        return [
            'key' => $plate['key'],
            'plate' => $plate['label'],
            'found' => $found,
            'driver_name' => $unit?->driver_name ?: ($checklists->first()?->driver_name ?? ''),
            'driver_dni' => $unit?->driver_dni ?: '',
            'provider' => $unit?->provider ?: ($checklists->first()?->provider ?? ''),
            'correlative' => $unit?->correlative ?: '',
            'period' => $unit?->period?->name ?: '',
            'coordinator' => $unit?->coordinatorUser?->name ?: '',
            'unit_status' => $unit === null ? '' : ($unit->status === 'active' ? 'Activa' : 'De baja'),
            'documents' => $documents,
            'docs_done' => collect($documents)->where('state', '!=', 'falta')->count(),
            'docs_total' => count($documents),
            'docs_expired' => collect($documents)->where('state', 'vencido')->count(),
            'inspections' => $inspections,
            'latest' => $latest,
            'inductions' => $inductions,
            'badges' => $this->badges($found, $documents, $latest, count($inductions)),
        ];
    }

    /**
     * @param  Collection<int, Unit>  $units
     */
    private function preferredUnit(Collection $units): ?Unit
    {
        return $units
            ->sortByDesc(fn (Unit $unit) => ($unit->status === 'active' ? 1_000_000_000 : 0) + $unit->id)
            ->first();
    }

    /**
     * @return list<array{type: string, label: string, state: string, expires_at: string}>
     */
    private function documents(?Unit $unit): array
    {
        $byType = [];

        foreach ($unit?->documents ?? [] as $document) {
            $type = (string) $document->type;

            if ($type === 'circulation_permit') {
                $type = UnitDocumentTypes::SCTR;
            }

            $expires = $document->expires_at;
            $expired = $expires !== null && $expires->copy()->endOfDay()->lt(now());
            $current = $byType[$type] ?? null;

            if ($current === null || ($current['state'] === 'vencido' && ! $expired)) {
                $byType[$type] = [
                    'state' => $expired ? 'vencido' : 'vigente',
                    'expires_at' => $expires?->format('d/m/Y') ?? '',
                ];
            }
        }

        $rows = [];

        foreach (UnitDocumentTypes::requiredKeys() as $type) {
            $current = $byType[$type] ?? null;
            $rows[] = [
                'type' => $type,
                'label' => UnitDocumentTypes::label($type),
                'state' => $current['state'] ?? 'falta',
                'expires_at' => $current['expires_at'] ?? '',
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    private function inspection(UnitChecklist $checklist): array
    {
        $answers = ChecklistItem::sortAnswers($checklist->answers);
        $firstFailed = [];
        $secondFailed = [];

        foreach ($answers as $answer) {
            $label = $this->itemLabel($answer->item);

            if ($answer->first_value === 'no') {
                $firstFailed[] = $label;
            }

            if ($answer->second_value === 'no') {
                $secondFailed[] = $label;
            }
        }

        return [
            'id' => $checklist->id,
            'period' => $checklist->period?->name ?: '',
            'inspector' => $checklist->creator?->name ?: '',
            'first_result' => $this->resultLabel($checklist->first_result),
            'first_tone' => $this->resultTone($checklist->first_result),
            'first_date' => $checklist->first_inspected_on?->format('d/m/Y') ?? '',
            'first_failed' => $firstFailed,
            'second_result' => $this->resultLabel($checklist->second_result),
            'second_tone' => $this->resultTone($checklist->second_result),
            'second_date' => $checklist->second_inspected_on?->format('d/m/Y') ?? '',
            'second_failed' => $secondFailed,
            'subsanada' => $checklist->coordinator_signed_at !== null,
            'signer' => $checklist->coordinator_signer_name ?: '',
            'signed_at' => $checklist->coordinator_signed_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') ?? '',
        ];
    }

    /**
     * @param  Collection<int, InductionAttendee>  $attendees
     * @return list<array<string, mixed>>
     */
    private function inductions(Collection $attendees, string $plateKey, string $dni): array
    {
        $seen = [];
        $rows = [];

        foreach ($attendees as $attendee) {
            $matchesPlate = $this->plateKey($attendee->plate_number) === $plateKey;
            $matchesDni = $dni !== '' && $this->digits($attendee->driver_dni) === $dni;

            if (! $matchesPlate && ! $matchesDni) {
                continue;
            }

            $induction = $attendee->induction;

            if ($induction === null || isset($seen[$induction->id])) {
                continue;
            }

            $seen[$induction->id] = true;
            $date = $induction->session_date
                ?? $induction->scheduled_at?->timezone(config('app.timezone'));
            $rows[] = [
                'id' => $induction->id,
                'title' => $induction->title,
                'acta' => $induction->acta_number ?: '',
                'date' => $date?->format('d/m/Y') ?? '',
                'status' => InductionStatuses::label((string) $induction->status),
                'attendance' => InductionAttendeeStatuses::label((string) $attendee->status),
                'signed' => $attendee->isSigned(),
            ];
        }

        return $rows;
    }

    /**
     * @param  list<array{type: string, label: string, state: string, expires_at: string}>  $documents
     * @param  array<string, mixed>|null  $latest
     * @return list<array{label: string, tone: string}>
     */
    private function badges(bool $found, array $documents, ?array $latest, int $inductionCount): array
    {
        if (! $found) {
            return [['label' => 'Sin registros', 'tone' => 'muted']];
        }

        $uploaded = collect($documents)->where('state', '!=', 'falta')->count();
        $expired = collect($documents)->where('state', 'vencido')->count();
        $total = count($documents);
        $docsTone = $uploaded === $total && $expired === 0 ? 'ok' : ($uploaded === 0 || $expired > 0 ? 'bad' : 'warn');
        $docsLabel = $expired > 0
            ? "Docs {$uploaded}/{$total} · {$expired} venc."
            : "Docs {$uploaded}/{$total}";

        $badges = [
            ['label' => $docsLabel, 'tone' => $docsTone],
        ];

        if ($latest === null) {
            $badges[] = ['label' => 'Sin inspección', 'tone' => 'muted'];
        } else {
            $badges[] = ['label' => '1ra '.$latest['first_result'], 'tone' => $latest['first_tone']];
            $badges[] = ['label' => '2da '.$latest['second_result'], 'tone' => $latest['second_tone']];
            $badges[] = [
                'label' => $latest['subsanada'] ? 'Subsanada' : 'Sin firma',
                'tone' => $latest['subsanada'] ? 'ok' : 'warn',
            ];
        }

        $badges[] = [
            'label' => $inductionCount === 1 ? '1 inducción' : "{$inductionCount} inducciones",
            'tone' => $inductionCount > 0 ? 'info' : 'muted',
        ];

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
            if (! $row['found']) {
                $summary['missing']++;

                continue;
            }

            $summary['found']++;
            $latest = $row['latest'];

            if ($latest !== null && ($latest['first_result'] === 'Desaprobada' || $latest['second_result'] === 'Desaprobada')) {
                $summary['rejected']++;
            }

            if ($row['docs_done'] < $row['docs_total'] || $row['docs_expired'] > 0) {
                $summary['docs']++;
            }

            if ($latest !== null && ! $latest['subsanada'] && ($latest['first_result'] === 'Desaprobada' || $latest['second_result'] === 'Desaprobada')) {
                $summary['unsigned']++;
            }

            if ($row['inductions'] === []) {
                $summary['without_induction']++;
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
            'rejected' => 0,
            'docs' => 0,
            'unsigned' => 0,
            'without_induction' => 0,
        ];
    }

    private function resultLabel(?string $result): string
    {
        return match ($result) {
            'approved' => 'Aprobada',
            'rejected' => 'Desaprobada',
            default => 'Sin registrar',
        };
    }

    private function resultTone(?string $result): string
    {
        return match ($result) {
            'approved' => 'ok',
            'rejected' => 'bad',
            default => 'muted',
        };
    }

    private function itemLabel(mixed $item): string
    {
        if ($item === null) {
            return 'Ítem';
        }

        $own = trim(((string) $item->item_number).' '.(string) $item->label);
        $parent = $item->parent;

        if ($parent === null) {
            return $own;
        }

        $parentLabel = trim(((string) $parent->item_number).' '.(string) $parent->label);

        return trim($parentLabel.' · '.$own);
    }

    /**
     * @param  list<string>  $keys
     */
    private function plateSql(string $column, array $keys): string
    {
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));

        return "regexp_replace(upper({$column}), '[^A-Z0-9]', '', 'g') in ({$placeholders})";
    }

    /**
     * @param  list<string>  $keys
     */
    private function digitsSql(string $column, array $keys): string
    {
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));

        return "regexp_replace({$column}, '[^0-9]', '', 'g') in ({$placeholders})";
    }

    public function plateKey(?string $plate): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', (string) $plate));
    }

    private function digits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?: '';
    }
}
