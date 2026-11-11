<?php

namespace App\Support;

use App\Models\ObservationRemediation;
use App\Models\UnitChecklist;
use Illuminate\Database\Eloquent\Builder;
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
    /**
     * @param  array{search?: ?string, sede?: ?string, provider?: ?string}  $filters
     */
    public function month(int $year, int $month, array $filters = []): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end = $start->copy()->endOfMonth();
        $from = $start->toDateString();
        $to = $end->toDateString();

        $checklists = $this->applyFilters(
            ObservationRemediationSupport::scopedChecklists()
                ->with([
                    'answers:id,unit_checklist_id,checklist_item_id,first_value,second_value,observations',
                    'answers.item:id,weight,label,item_number',
                    'observationRemediations',
                    'unit:id,driver_dni,sede,provider',
                ])
                ->where(function ($q) use ($from, $to) {
                    $q->whereBetween('first_inspected_on', [$from, $to])
                        ->orWhereBetween('second_inspected_on', [$from, $to]);
                }),
            $filters,
        )->get();

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
                    || (ObservationRemediationSupport::isRemediableGrade($grade)
                        && $remediation?->status === ObservationRemediation::VERIFIED)
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

            $days[] = [
                'date' => $date,
                'tone' => $tone,
                'amber' => $amber,
                'red' => $red,
                'green' => $green,
                'label' => self::dayLabel($green, $amber, $red),
            ];
        }

        return [
            'year' => $year,
            'month' => $month,
            'days' => $days,
        ];
    }

    /**
     * Unidades del día: aprobadas, c/ obs. y desaprobadas.
     *
     * @return list<array<string, mixed>>
     */
    /**
     * @param  array{search?: ?string, sede?: ?string, provider?: ?string}  $filters
     */
    public function dayUnits(string $date, array $filters = []): array
    {
        $checklists = $this->applyFilters(
            ObservationRemediationSupport::scopedChecklists()
                ->with([
                    'unit:id,coordinator_id,sede,garita,plate_number,responsible_person,driver_dni,driver_name,provider',
                    'creator:id,name',
                    'template:id,type,code,name',
                    'answers:id,unit_checklist_id,checklist_item_id,first_value,second_value,observations',
                    'answers.item:id,weight,label,item_number',
                    'observationRemediations.photos',
                    'observationRemediations.events.user:id,name',
                ])
                ->where(function ($q) use ($date) {
                    $q->whereDate('first_inspected_on', $date)
                        ->orWhereDate('second_inspected_on', $date);
                })
                ->orderBy('plate_number'),
            $filters,
        )->get();

        $rows = [];

        foreach ($checklists as $checklist) {
            foreach (ObservationRemediationSupport::listedPasses($checklist) as $passInfo) {
                if ($passInfo['date'] !== $date) {
                    continue;
                }

                $rows[] = $this->serializeUnit($checklist, $passInfo);
            }
        }

        usort($rows, function (array $a, array $b) {
            $order = ['red' => 0, 'amber' => 1, 'green' => 2];

            return ($order[$a['tone']] ?? 9) <=> ($order[$b['tone']] ?? 9)
                ?: strcmp((string) $a['plate_number'], (string) $b['plate_number']);
        });

        return $rows;
    }

    /**
     * Lista del mes: solo aprobados c/ obs. y desaprobados (para tab Lista).
     *
     * @return list<array<string, mixed>>
     */
    /**
     * @param  array{search?: ?string, sede?: ?string, provider?: ?string}  $filters
     */
    public function actionableList(int $year, int $month, array $filters = []): array
    {
        return $this->monthPassRows(
            $year,
            $month,
            $filters,
            onlyActionable: true,
        );
    }

    /**
     * Resultados de búsqueda en calendario: todas las inspecciones del mes que coinciden.
     *
     * @param  array{search?: ?string, sede?: ?string, provider?: ?string}  $filters
     * @return list<array<string, mixed>>
     */
    public function searchMonthUnits(int $year, int $month, array $filters = []): array
    {
        return $this->monthPassRows(
            $year,
            $month,
            $filters,
            onlyActionable: false,
        );
    }

    /**
     * @param  array{search?: ?string, sede?: ?string, provider?: ?string}  $filters
     * @return list<array<string, mixed>>
     */
    private function monthPassRows(
        int $year,
        int $month,
        array $filters,
        bool $onlyActionable,
    ): array {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end = $start->copy()->endOfMonth();
        $from = $start->toDateString();
        $to = $end->toDateString();

        $checklists = $this->applyFilters(
            ObservationRemediationSupport::scopedChecklists()
                ->with([
                    'unit:id,coordinator_id,sede,garita,plate_number,responsible_person,driver_dni,driver_name,provider',
                    'creator:id,name',
                    'template:id,type,code,name',
                    'answers:id,unit_checklist_id,checklist_item_id,first_value,second_value,observations',
                    'answers.item:id,weight,label,item_number',
                    'observationRemediations.photos',
                    'observationRemediations.events.user:id,name',
                ])
                ->where(function ($q) use ($from, $to) {
                    $q->whereBetween('first_inspected_on', [$from, $to])
                        ->orWhereBetween('second_inspected_on', [$from, $to]);
                })
                ->orderBy('plate_number'),
            $filters,
        )->get();

        $rows = [];

        foreach ($checklists as $checklist) {
            $passes = $onlyActionable
                ? ObservationRemediationSupport::actionablePasses($checklist)
                : ObservationRemediationSupport::listedPasses($checklist);

            foreach ($passes as $passInfo) {
                $dateKey = Carbon::parse($passInfo['date'])->toDateString();

                if ($dateKey < $from || $dateKey > $to) {
                    continue;
                }

                $rows[] = [
                    ...$this->serializeUnit($checklist, $passInfo),
                    'inspected_on' => $dateKey,
                ];
            }
        }

        usort($rows, function (array $a, array $b) {
            $order = ['red' => 0, 'amber' => 1, 'green' => 2];

            return strcmp((string) ($b['inspected_on'] ?? ''), (string) ($a['inspected_on'] ?? ''))
                ?: ($order[$a['tone']] ?? 9) <=> ($order[$b['tone']] ?? 9)
                ?: strcmp((string) $a['plate_number'], (string) $b['plate_number']);
        });

        return $rows;
    }

    /**
     * @param  Builder<UnitChecklist>  $query
     * @param  array{search?: ?string, sede?: ?string, provider?: ?string}  $filters
     * @return Builder<UnitChecklist>
     */
    private function applyFilters(Builder $query, array $filters = []): Builder
    {
        $search = trim((string) ($filters['search'] ?? '')) ?: null;
        $sede = trim((string) ($filters['sede'] ?? '')) ?: null;
        $provider = trim((string) ($filters['provider'] ?? '')) ?: null;

        if ($sede !== null) {
            $query->whereHas('unit', function (Builder $unit) use ($sede) {
                $unit->where('sede', $sede);
            });
        }

        if ($provider !== null) {
            $query->where(function (Builder $builder) use ($provider) {
                $builder
                    ->where('provider', $provider)
                    ->orWhereHas('unit', function (Builder $unit) use ($provider) {
                        $unit->where('provider', $provider);
                    });
            });
        }

        if ($search === null) {
            return $query;
        }

        $like = '%'.$search.'%';
        $compact = preg_replace('/[\s\-_.]+/', '', $search) ?: $search;
        $compactLike = '%'.$compact.'%';
        $digits = preg_replace('/\D+/', '', $search) ?: '';
        // Solo ampliar a DNI por dígitos si la búsqueda es numérica (evita que "a4f" → "%4%").
        $dniLike = ($digits !== '' && ! preg_match('/\p{L}/u', $search))
            ? '%'.$digits.'%'
            : null;

        $plateCompactSql = "REPLACE(REPLACE(REPLACE(COALESCE(%s, ''), '-', ''), ' ', ''), '_', '') ILIKE ?";

        return $query->where(function (Builder $builder) use ($like, $compactLike, $dniLike, $plateCompactSql) {
            $builder
                ->where('plate_number', 'ilike', $like)
                ->orWhere('driver_name', 'ilike', $like)
                ->orWhereRaw(sprintf($plateCompactSql, 'plate_number'), [$compactLike]);

            if ($dniLike !== null) {
                $builder->orWhereHas('unit', function (Builder $unit) use ($dniLike) {
                    $unit->where('driver_dni', 'ilike', $dniLike);
                });
            }

            $builder->orWhereHas('unit', function (Builder $unit) use ($like, $compactLike, $dniLike, $plateCompactSql) {
                $unit
                    ->where('driver_name', 'ilike', $like)
                    ->orWhere('driver_dni', 'ilike', $like)
                    ->orWhere('plate_number', 'ilike', $like)
                    ->orWhereRaw(sprintf($plateCompactSql, 'plate_number'), [$compactLike]);

                if ($dniLike !== null) {
                    $unit->orWhere('driver_dni', 'ilike', $dniLike);
                }
            });
        });
    }

    private static function dayLabel(int $green, int $amber, int $red): ?string
    {
        $parts = [];
        if ($green > 0) {
            $parts[] = "{$green} OK";
        }
        if ($amber > 0) {
            $parts[] = "{$amber} obs.";
        }
        if ($red > 0) {
            $parts[] = "{$red} desap.";
        }

        return $parts === [] ? null : implode(' · ', $parts);
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
        $tone = match ($passInfo['grade']) {
            'rejected' => 'red',
            'approved' => 'green',
            default => 'amber',
        };

        return [
            'checklist_id' => $checklist->id,
            'pass' => $pass,
            'pass_label' => $pass === 'second' ? '2da inspección' : '1ra inspección',
            'tone' => $tone,
            'grade' => $passInfo['grade'],
            'grade_label' => match ($passInfo['grade']) {
                'rejected' => 'Desaprobado',
                'approved_notes' => 'Aprobado c/ obs.',
                'approved' => 'Aprobado',
                default => $passInfo['grade'],
            },
            'percent' => $passInfo['percent'],
            'plate_number' => $checklist->plate_number,
            'driver_name' => $checklist->driver_name,
            'driver_dni' => $checklist->unit?->driver_dni,
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
            ],
            'history' => $this->serializeHistory($remediation),
            'observations' => $this->observationsWithPhotos(
                $checklist,
                $pass,
                $passInfo['grade'],
                $remediation,
            ),
            'can_submit' => ObservationRemediationSupport::isRemediableGrade($passInfo['grade'])
                && in_array($status, [ObservationRemediation::OPEN, ObservationRemediation::REJECTED], true),
            'can_verify' => ObservationRemediationSupport::isRemediableGrade($passInfo['grade'])
                && $status === ObservationRemediation::SUBMITTED
                && $this->canVerify($checklist),
        ];
    }

    /**
     * @return list<array{id: int, event: string, label: string, detail: string|null, user: string|null, at: string|null}>
     */
    private function serializeHistory(?ObservationRemediation $remediation): array
    {
        if ($remediation === null) {
            return [];
        }

        $events = $remediation->relationLoaded('events')
            ? $remediation->events->sortBy('id')->values()
            : $remediation->events()->with('user:id,name')->orderBy('id')->get();

        return $events->map(function ($event) {
            $payload = is_array($event->payload) ? $event->payload : [];
            $label = match ($event->event) {
                'submitted' => 'Coordinador envió el levantamiento',
                'rejected' => 'Inspector rechazó el levantamiento',
                'verified' => 'Inspector aprobó: pasó a Aprobado',
                default => (string) $event->event,
            };

            $detail = match ($event->event) {
                'submitted' => $this->historySubmittedDetail($payload),
                'rejected' => filled($payload['note'] ?? null)
                    ? 'Motivo: '.(string) $payload['note']
                    : null,
                'verified' => $this->historyVerifiedDetail($payload),
                default => null,
            };

            return [
                'id' => $event->id,
                'event' => $event->event,
                'label' => $label,
                'detail' => $detail,
                'user' => $event->user?->name,
                'at' => optional($event->created_at)?->timezone(config('app.timezone'))->format('d/m/Y H:i'),
            ];
        })->values()->all();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function historySubmittedDetail(array $payload): ?string
    {
        $parts = [];
        $count = (int) ($payload['observations_count'] ?? 0);
        if ($count > 0) {
            $parts[] = "{$count} ítem(s) en NO";
        }
        $photoIds = $payload['photo_answer_ids'] ?? [];
        if (is_array($photoIds) && $photoIds !== []) {
            $parts[] = count($photoIds).' foto(s)';
        } elseif (! empty($payload['has_photo'])) {
            $parts[] = 'Con foto';
        } else {
            $parts[] = 'Sin fotos';
        }

        return $parts === [] ? null : implode(' · ', $parts);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function historyVerifiedDetail(array $payload): ?string
    {
        $parts = [];
        $prev = $payload['previous_percent'] ?? null;
        $next = $payload['new_percent'] ?? null;
        if ($prev !== null && $next !== null) {
            $parts[] = "Pareto {$prev}% → {$next}%";
        }
        $updated = $payload['answers_updated'] ?? [];
        if (is_array($updated) && $updated !== []) {
            $parts[] = count($updated).' ítem(s) NO → SÍ';
        }
        if (filled($payload['note'] ?? null)) {
            $parts[] = 'Nota: '.(string) $payload['note'];
        }

        return $parts === [] ? 'Inspección aprobada al 100 %' : implode(' · ', $parts);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function observationsWithPhotos(
        UnitChecklist $checklist,
        string $pass,
        string $grade,
        ?ObservationRemediation $remediation,
    ): array {
        if ($grade === 'approved') {
            return [];
        }

        $photosByAnswer = ($remediation?->photos ?? collect())
            ->groupBy(fn ($photo) => (int) ($photo->unit_checklist_answer_id ?? 0));

        return collect(ObservationRemediationSupport::observationItems($checklist, $pass))
            ->map(function (array $item) use ($photosByAnswer) {
                $photos = $photosByAnswer->get((int) $item['id'], collect())
                    ->map(fn ($photo) => [
                        'id' => $photo->id,
                        'url' => $photo->url(),
                    ])
                    ->values()
                    ->all();

                return [
                    ...$item,
                    'photos' => $photos,
                ];
            })
            ->values()
            ->all();
    }

    private function statusLabel(string $status, string $grade): string
    {
        if ($grade === 'approved') {
            return $status === ObservationRemediation::VERIFIED
                ? 'Aprobado (obs. levantada)'
                : 'Aprobado';
        }

        $prefix = $grade === 'rejected' ? 'Desaprobado · ' : '';

        return match ($status) {
            ObservationRemediation::SUBMITTED => $prefix.'Pendiente de inspector',
            ObservationRemediation::VERIFIED => $prefix.'Levantamiento verificado',
            ObservationRemediation::REJECTED => $prefix.'Rechazado por inspector',
            default => $prefix.'Pendiente de levantar',
        };
    }

    private function canVerify(UnitChecklist $checklist): bool
    {
        $user = Auth::user();
        if ($user === null) {
            return false;
        }

        return $user->can('observation_remediations.verify');
    }
}
