<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\InspectorQuota;
use App\Models\UnitChecklist;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

final class OwnerReports
{
    /**
     * @param  list<array{user_id: int, daily_quota: int|null}>  $rows
     */
    public function saveQuotas(array $rows): void
    {
        $inspectors = SystemRoles::inspectors()->keyBy('id');

        foreach ($rows as $row) {
            $userId = (int) $row['user_id'];

            if (! $inspectors->has($userId)) {
                continue;
            }

            $quota = $row['daily_quota'] ?? null;

            if ($quota === null) {
                InspectorQuota::query()->where('user_id', $userId)->delete();

                continue;
            }

            InspectorQuota::query()->updateOrCreate(
                ['user_id' => $userId],
                ['daily_quota' => (int) $quota],
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function build(Request $request): array
    {
        $range = ReportPeriod::range(
            $request->input('date_from'),
            $request->input('date_to'),
        );
        $inspectors = SystemRoles::inspectors();
        $quotaMap = InspectorQuota::query()
            ->pluck('daily_quota', 'user_id')
            ->mapWithKeys(fn ($quota, $id) => [(int) $id => (int) $quota]);
        $checklists = $this->checklists($range['from'], $range['to']);
        $periodCounts = $this->countsByInspector($checklists);
        $days = $this->daysByInspector($checklists);
        $singleDay = $range['from'] !== null && $range['from'] === $range['to'];
        $sessions = $this->sessions($range['from'], $range['to']);

        $quotaRows = $inspectors->map(function (User $user) use ($quotaMap, $periodCounts, $days, $singleDay) {
            $quota = $quotaMap->has($user->id) ? (int) $quotaMap[$user->id] : null;
            $periodTotal = (int) ($periodCounts[$user->id] ?? 0);
            $worked = $days[$user->id] ?? [];
            $met = 0;

            foreach ($worked as $count) {
                if ($quota !== null && $count >= $quota) {
                    $met++;
                }
            }

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'daily_quota' => $quota,
                'today' => $periodTotal,
                'period' => $periodTotal,
                'days_met' => $met,
                'days_with_work' => count($worked),
                'tone' => $singleDay
                    ? $this->goalTone($periodTotal, $quota)
                    : $this->daysTone($met, count($worked), $quota),
            ];
        })->values()->all();

        $inductionRows = $sessions->map(fn (Induction $induction) => $this->inductionRow($induction))->values()->all();
        $details = $checklists
            ->sortByDesc(fn (UnitChecklist $checklist) => $this->startedAt($checklist)?->getTimestamp() ?? 0)
            ->values();
        $detailRows = $details->take(300)->map(fn (UnitChecklist $checklist) => $this->detailRow($checklist))->all();
        $inspectorRows = $this->inspectorSummaries($inspectors, $quotaMap, $checklists, $days);

        $cited = array_sum(array_column($inductionRows, 'cited'));
        $arrived = array_sum(array_column($inductionRows, 'arrived'));
        $signed = array_sum(array_column($inductionRows, 'signed'));
        $absent = array_sum(array_column($inductionRows, 'absent'));
        $withQuota = count(array_filter($quotaRows, fn (array $row) => $row['daily_quota'] !== null));
        $metToday = count(array_filter(
            $quotaRows,
            fn (array $row) => $row['tone'] === 'ok',
        ));
        $durations = array_values(array_filter(array_column($detailRows, 'minutes'), fn ($minutes) => $minutes !== null));

        return [
            'filters' => [
                'date_from' => $range['from'],
                'date_to' => $range['to'],
                'label' => $range['label'],
            ],
            'quotas' => $quotaRows,
            'inductions' => $inductionRows,
            'inspectors' => $inspectorRows,
            'details' => $detailRows,
            'details_total' => $details->count(),
            'summary' => [
                'inspectors' => count($quotaRows),
                'with_quota' => $withQuota,
                'met_today' => $metToday,
                'today_goal_percent' => $withQuota > 0 ? (int) round(($metToday / $withQuota) * 100) : 0,
                'inspections' => $checklists->count(),
                'avg_minutes' => $durations === [] ? null : (int) round(array_sum($durations) / count($durations)),
                'sessions' => count($inductionRows),
                'cited' => $cited,
                'arrived' => $arrived,
                'signed' => $signed,
                'absent' => $absent,
                'attendance_percent' => $cited > 0 ? (int) round(($arrived / $cited) * 100) : 0,
                'signed_percent' => $cited > 0 ? (int) round(($signed / $cited) * 100) : 0,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function pdfBinary(array $data, string $company): string
    {
        return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.owner-report', [
            'company' => $company,
            'generatedAt' => CarbonImmutable::now('America/Lima')->format('d/m/Y H:i'),
            ...$data,
        ])->setPaper('a4', 'landscape')->output();
    }

    /**
     * @return Collection<int, UnitChecklist>
     */
    private function checklists(?string $from, ?string $to): Collection
    {
        $query = UnitChecklist::query()->with('creator:id,name');

        if ($from !== null && $to !== null) {
            $query->where(function ($builder) use ($from, $to) {
                $builder
                    ->whereBetween('first_inspected_on', [$from, $to])
                    ->orWhereBetween('second_inspected_on', [$from, $to])
                    ->orWhereRaw('started_at::date between ? and ?', [$from, $to]);
            });
        }

        return $query->get();
    }

    /**
     * @return Collection<int, Induction>
     */
    private function sessions(?string $from, ?string $to): Collection
    {
        $query = Induction::query()->with([
            'creator:id,name',
            'attendees:id,induction_id,status,signature_path,fingerprint_path',
        ]);

        if ($from !== null && $to !== null) {
            $query->where(function ($builder) use ($from, $to) {
                $builder
                    ->whereBetween('session_date', [$from, $to])
                    ->orWhereBetween('scheduled_at', [$from.' 00:00:00', $to.' 23:59:59']);
            });
        }

        return $query->orderByDesc('scheduled_at')->orderByDesc('id')->get();
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return array<int, int>
     */
    private function countsByInspector(Collection $checklists): array
    {
        $counts = [];

        foreach ($checklists as $checklist) {
            $id = (int) ($checklist->created_by ?? 0);
            $counts[$id] = ($counts[$id] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return array<int, array<string, int>>
     */
    private function daysByInspector(Collection $checklists): array
    {
        $days = [];

        foreach ($checklists as $checklist) {
            $id = (int) ($checklist->created_by ?? 0);
            $date = $checklist->first_inspected_on?->toDateString()
                ?? $this->startedAt($checklist)?->toDateString();

            if ($date === null) {
                continue;
            }

            $days[$id][$date] = ($days[$id][$date] ?? 0) + 1;
        }

        return $days;
    }

    /**
     * @param  Collection<int, User>  $inspectors
     * @param  Collection<int|string, mixed>  $quotaMap
     * @param  Collection<int, UnitChecklist>  $checklists
     * @param  array<int, array<string, int>>  $days
     * @return list<array<string, mixed>>
     */
    private function inspectorSummaries(Collection $inspectors, Collection $quotaMap, Collection $checklists, array $days): array
    {
        $names = $inspectors->mapWithKeys(fn (User $user) => [$user->id => $user->name]);
        $groups = [];

        foreach ($checklists as $checklist) {
            $id = (int) ($checklist->created_by ?? 0);
            $groups[$id] ??= [];
            $minutes = $this->minutes($this->startedAt($checklist), $this->finishedAt($checklist));

            if ($minutes !== null) {
                $groups[$id][] = $minutes;
            }
        }

        $ids = array_unique([
            ...$inspectors->pluck('id')->all(),
            ...array_keys($groups),
        ]);

        $rows = [];

        foreach ($ids as $id) {
            $id = (int) $id;

            if ($id === 0 && ! isset($groups[0])) {
                continue;
            }

            $quota = $quotaMap->has($id) ? (int) $quotaMap[$id] : null;
            $worked = $days[$id] ?? [];
            $met = 0;

            foreach ($worked as $count) {
                if ($quota !== null && $count >= $quota) {
                    $met++;
                }
            }

            $samples = $groups[$id] ?? [];
            $total = array_sum($worked);

            $rows[] = [
                'user_id' => $id,
                'name' => $names[$id] ?? ($id === 0 ? 'Sin inspector' : 'Usuario '.$id),
                'total' => $total,
                'quota' => $quota,
                'days_met' => $met,
                'days_with_work' => count($worked),
                'avg_minutes' => $samples === [] ? null : (int) round(array_sum($samples) / count($samples)),
                'tone' => $this->daysTone($met, count($worked), $quota),
            ];
        }

        usort($rows, fn (array $left, array $right) => $right['total'] <=> $left['total']);

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    private function inductionRow(Induction $induction): array
    {
        $cited = 0;
        $arrived = 0;
        $signed = 0;
        $absent = 0;
        $pending = 0;

        foreach ($induction->attendees as $attendee) {
            $cited++;
            $hasSignature = filled($attendee->signature_path);
            $hasFingerprint = filled($attendee->fingerprint_path);
            $didArrive = $attendee->status === InductionAttendeeStatuses::ATTENDED || $hasSignature;

            if ($hasSignature && $hasFingerprint) {
                $signed++;
            }

            if ($didArrive) {
                $arrived++;
            } elseif ($attendee->status === InductionAttendeeStatuses::ABSENT) {
                $absent++;
            } else {
                $pending++;
            }
        }

        $when = $induction->scheduled_at
            ? $induction->scheduled_at->timezone('America/Lima')->format('d/m/Y H:i')
            : ($induction->session_date?->format('d/m/Y') ?? 'Sin fecha');
        $facilitator = trim((string) ($induction->creator?->name ?: $induction->speaker_name));

        return [
            'id' => $induction->id,
            'title' => trim((string) $induction->title) !== ''
                ? trim((string) $induction->title)
                : (InductionFormOptions::activities()[$induction->activity] ?? 'Inducción'),
            'when' => $when,
            'status' => InductionStatuses::label((string) $induction->status),
            'facilitator' => $facilitator !== '' ? $facilitator : 'Sin responsable',
            'cited' => $cited,
            'arrived' => $arrived,
            'signed' => $signed,
            'absent' => $absent,
            'pending' => $pending,
            'arrived_percent' => $cited > 0 ? (int) round(($arrived / $cited) * 100) : 0,
            'signed_percent' => $cited > 0 ? (int) round(($signed / $cited) * 100) : 0,
            'tone' => $this->percentTone($cited > 0 ? (int) round(($arrived / $cited) * 100) : 0, $cited > 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailRow(UnitChecklist $checklist): array
    {
        $firstAt = $this->passAt(
            $checklist->first_inspected_on,
            $checklist->first_inspected_time,
            $this->startedAt($checklist),
        );
        $secondAt = $this->passAt(
            $checklist->second_inspected_on,
            $checklist->second_inspected_time,
            null,
        );
        $firstDone = in_array($checklist->first_result, ['approved', 'rejected'], true);
        $secondDone = in_array($checklist->second_result, ['approved', 'rejected'], true);
        $finished = $firstDone && $secondDone;

        return [
            'id' => $checklist->id,
            'plate' => $checklist->plate_number,
            'inspector' => $checklist->creator?->name ?: 'Sin inspector',
            'started' => $firstAt?->format('d/m/Y H:i') ?? '—',
            'finished' => $finished ? 'Terminada' : 'En curso',
            'minutes' => null,
            'duration' => $finished ? 'Terminada' : 'En curso',
            'result' => $finished ? 'Terminada' : 'En curso',
            'tone' => $finished ? 'ok' : 'mid',
            'first_at' => $firstAt?->format('d/m/Y H:i') ?? '—',
            'first_result' => $this->resultLabel($checklist->first_result),
            'first_tone' => $this->resultTone($checklist->first_result, $firstDone),
            'second_at' => $secondAt?->format('d/m/Y H:i') ?? ($firstDone ? 'Pendiente' : '—'),
            'second_result' => $secondDone ? $this->resultLabel($checklist->second_result) : 'Pendiente',
            'second_tone' => $this->resultTone($checklist->second_result, $secondDone),
            'status' => $finished ? 'Terminada' : 'En curso',
            'status_tone' => $finished ? 'ok' : 'mid',
        ];
    }

    private function resultLabel(?string $result): string
    {
        return match ($result) {
            'approved' => 'Aprobada',
            'rejected' => 'Desaprobada',
            default => 'Pendiente',
        };
    }

    private function resultTone(?string $result, bool $done): string
    {
        if (! $done) {
            return 'mid';
        }

        return $result === 'approved' ? 'ok' : 'bad';
    }

    private function passAt(mixed $date, ?string $time, ?CarbonImmutable $fallback): ?CarbonImmutable
    {
        if ($date === null) {
            return $fallback;
        }

        $day = $date instanceof \DateTimeInterface
            ? CarbonImmutable::parse($date)->timezone('America/Lima')->toDateString()
            : (string) $date;
        $clock = trim((string) $time);

        if ($clock === '' || str_starts_with($clock, '00:00')) {
            if ($fallback !== null && $fallback->toDateString() === $day) {
                return $fallback;
            }

            $clock = '00:00:00';
        }

        return CarbonImmutable::parse($day.' '.substr($clock, 0, 8), 'America/Lima');
    }

    private function startedAt(UnitChecklist $checklist): ?CarbonImmutable
    {
        if ($checklist->started_at) {
            return CarbonImmutable::parse($checklist->started_at)->timezone('America/Lima');
        }

        $time = (string) $checklist->first_inspected_time;

        if ($checklist->first_inspected_on && $time !== '' && ! str_starts_with($time, '00:00')) {
            return CarbonImmutable::parse(
                $checklist->first_inspected_on->toDateString().' '.$time,
                'America/Lima',
            );
        }

        return $checklist->created_at
            ? CarbonImmutable::parse($checklist->created_at)->timezone('America/Lima')
            : null;
    }

    private function finishedAt(UnitChecklist $checklist): ?CarbonImmutable
    {
        if ($checklist->finished_at) {
            return CarbonImmutable::parse($checklist->finished_at)->timezone('America/Lima');
        }

        if ($checklist->sealed_at) {
            return CarbonImmutable::parse($checklist->sealed_at)->timezone('America/Lima');
        }

        return null;
    }

    private function minutes(?CarbonImmutable $start, ?CarbonImmutable $end): ?int
    {
        if ($start === null || $end === null) {
            return null;
        }

        return max(0, (int) abs($start->diffInMinutes($end)));
    }

    private function durationLabel(?int $minutes): string
    {
        if ($minutes === null) {
            return 'En curso';
        }

        if ($minutes < 60) {
            return $minutes.' min';
        }

        $hours = intdiv($minutes, 60);
        $rest = $minutes % 60;

        return $rest > 0 ? "{$hours} h {$rest} min" : "{$hours} h";
    }

    private function goalTone(int $done, ?int $quota): string
    {
        if ($quota === null || $quota <= 0) {
            return 'muted';
        }

        return $this->percentTone((int) round(($done / $quota) * 100), true);
    }

    private function daysTone(int $met, int $worked, ?int $quota): string
    {
        if ($quota === null || $worked === 0) {
            return 'muted';
        }

        return $this->percentTone((int) round(($met / $worked) * 100), true);
    }

    private function percentTone(int $percent, bool $hasBase): string
    {
        if (! $hasBase) {
            return 'muted';
        }

        if ($percent >= 100) {
            return 'ok';
        }

        if ($percent >= 70) {
            return 'mid';
        }

        return 'bad';
    }
}
