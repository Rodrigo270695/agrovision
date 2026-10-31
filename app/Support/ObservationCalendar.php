<?php

namespace App\Support;

use App\Models\ObservationRemediation;
use App\Models\UnitChecklist;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

final class ObservationCalendar
{
    /**
     * @return array{
     *     year: int,
     *     month: int,
     *     days: list<array{date: string, tone: string, amber: int, red: int, green: int, label: string|null}>
     * }
     */
    public function month(int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end = $start->copy()->endOfMonth();
        $from = $start->toDateString();
        $to = $end->toDateString();

        $checklists = ObservationRemediationSupport::scopedChecklists()
            ->with([
                'answers:id,unit_checklist_id,checklist_item_id,first_value,second_value,observations',
                'answers.item:id,weight,label,item_number',
                'observationRemediations',
            ])
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('first_inspected_on', [$from, $to])
                    ->orWhereBetween('second_inspected_on', [$from, $to]);
            })
            ->get();

        /** @var array<string, list<string>> $byDate */
        $byDate = [];

        foreach ($checklists as $checklist) {
            foreach (['first', 'second'] as $pass) {
                $date = $pass === 'second'
                    ? $checklist->second_inspected_on
                    : $checklist->first_inspected_on;

                if ($date === null) {
                    continue;
                }

                $dateKey = Carbon::parse($date)->toDateString();
                if ($dateKey < $from || $dateKey > $to) {
                    continue;
                }

                $snap = ObservationRemediationSupport::passSnapshot($checklist, $pass);
                $grade = $snap['grade'];

                if ($grade === 'pending') {
                    continue;
                }

                $remediation = $checklist->observationRemediations
                    ->firstWhere('inspection_pass', $pass);

                if ($grade === 'approved'
                    || ($grade === 'approved_notes' && $remediation?->status === ObservationRemediation::VERIFIED)
                ) {
                    $byDate[$dateKey][] = 'approved';

                    continue;
                }

                if ($grade === 'rejected') {
                    $byDate[$dateKey][] = 'rejected';

                    continue;
                }

                if ($grade === 'approved_notes') {
                    $byDate[$dateKey][] = 'approved_notes';
                }
            }
        }

        $days = [];
        for ($day = 1; $day <= $end->day; $day++) {
            $date = Carbon::create($year, $month, $day)->toDateString();
            $grades = $byDate[$date] ?? [];
            $tone = ObservationRemediationSupport::dayTone($grades);
            $amber = count(array_filter($grades, fn ($g) => $g === 'approved_notes'));
            $red = count(array_filter($grades, fn ($g) => $g === 'rejected'));
            $green = count(array_filter($grades, fn ($g) => $g === 'approved'));

            $label = null;
            if ($tone === ObservationRemediationSupport::TONE_AMBER) {
                $label = $amber === 1 ? '1 obs.' : "{$amber} obs.";
            } elseif ($tone === ObservationRemediationSupport::TONE_RED) {
                $label = $red === 1 ? '1 desap.' : "{$red} desap.";
            } elseif ($tone === ObservationRemediationSupport::TONE_GREEN && $green > 0) {
                $label = 'OK';
            }

            $days[] = [
                'date' => $date,
                'tone' => $tone,
                'amber' => $amber,
                'red' => $red,
                'green' => $green,
                'label' => $label,
            ];
        }

        return [
            'year' => $year,
            'month' => $month,
            'days' => $days,
        ];
    }

    /**
     * Unidades con acción (ámbar/rojo). Verde → lista vacía.
     *
     * @return list<array<string, mixed>>
     */
    public function dayUnits(string $date): array
    {
        $checklists = ObservationRemediationSupport::scopedChecklists()
            ->with([
                'unit:id,coordinator_id,sede,garita,plate_number,responsible_person',
                'creator:id,name',
                'template:id,type,code,name',
                'answers:id,unit_checklist_id,checklist_item_id,first_value,second_value,observations',
                'answers.item:id,weight,label,item_number',
                'observationRemediations.photos',
            ])
            ->where(function ($q) use ($date) {
                $q->whereDate('first_inspected_on', $date)
                    ->orWhereDate('second_inspected_on', $date);
            })
            ->orderBy('plate_number')
            ->get();

        $rows = [];

        foreach ($checklists as $checklist) {
            foreach (ObservationRemediationSupport::actionablePasses($checklist) as $passInfo) {
                if ($passInfo['date'] !== $date) {
                    continue;
                }

                $rows[] = $this->serializeUnit($checklist, $passInfo);
            }
        }

        return $rows;
    }

    /**
     * @param  array{pass: string, date: string, grade: string, percent: float, has_no: bool}  $passInfo
     * @return array<string, mixed>
     */
    public function serializeUnit(UnitChecklist $checklist, array $passInfo): array
    {
        $pass = $passInfo['pass'];
        $remediation = $checklist->observationRemediations
            ->firstWhere('inspection_pass', $pass);

        $status = $remediation?->status ?? ObservationRemediation::OPEN;
        if ($passInfo['grade'] === 'rejected') {
            $tone = 'red';
        } else {
            $tone = 'amber';
        }

        return [
            'checklist_id' => $checklist->id,
            'pass' => $pass,
            'pass_label' => $pass === 'second' ? '2da inspección' : '1ra inspección',
            'tone' => $tone,
            'grade' => $passInfo['grade'],
            'grade_label' => match ($passInfo['grade']) {
                'rejected' => 'Desaprobado',
                'approved_notes' => 'Aprobado c/ obs.',
                default => $passInfo['grade'],
            },
            'percent' => $passInfo['percent'],
            'plate_number' => $checklist->plate_number,
            'driver_name' => $checklist->driver_name,
            'sede' => $checklist->unit?->sede,
            'garita' => $checklist->unit?->garita,
            'inspector' => $checklist->creator?->name,
            'inspector_id' => $checklist->created_by,
            'template' => $checklist->template?->type,
            'remediation' => [
                'id' => $remediation?->id,
                'status' => $status,
                'status_label' => $this->statusLabel($status, $passInfo['grade']),
                'submit_note' => $remediation?->submit_note,
                'rejection_note' => $remediation?->rejection_note,
                'submitted_at' => optional($remediation?->submitted_at)?->toIso8601String(),
                'verified_at' => optional($remediation?->verified_at)?->toIso8601String(),
                'photos' => ($remediation?->photos ?? collect())->map(fn ($photo) => [
                    'id' => $photo->id,
                    'url' => $photo->url(),
                ])->values()->all(),
            ],
            'observations' => ObservationRemediationSupport::observationItems($checklist, $pass),
            'can_submit' => $passInfo['grade'] === 'approved_notes'
                && in_array($status, [ObservationRemediation::OPEN, ObservationRemediation::REJECTED], true),
            'can_verify' => $passInfo['grade'] === 'approved_notes'
                && $status === ObservationRemediation::SUBMITTED
                && $this->canVerify($checklist),
        ];
    }

    private function statusLabel(string $status, string $grade): string
    {
        if ($grade === 'rejected') {
            return 'Desaprobado';
        }

        return match ($status) {
            ObservationRemediation::SUBMITTED => 'Pendiente de inspector',
            ObservationRemediation::VERIFIED => 'Levantamiento verificado',
            ObservationRemediation::REJECTED => 'Rechazado por inspector',
            default => 'Pendiente de levantar',
        };
    }

    private function canVerify(UnitChecklist $checklist): bool
    {
        $user = Auth::user();
        if ($user === null) {
            return false;
        }

        if ($user->can('observation_remediations.verify')
            && (int) $checklist->created_by === (int) $user->id
        ) {
            return true;
        }

        return $user->hasRole(SystemRoles::SUPERADMIN)
            && $user->can('observation_remediations.verify');
    }
}
