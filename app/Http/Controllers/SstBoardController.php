<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use App\Support\SystemRoles;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SstBoardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'week' => ['nullable', 'string', 'max:20'],
            'coordinator_id' => ['nullable', 'integer'],
            'vehicle_types' => ['nullable', 'array'],
            'vehicle_types.*' => ['string', 'max:80'],
            'template' => ['nullable', Rule::in(['tdp', 'tdc'])],
            'inspection' => ['nullable', Rule::in(['actual', 'first', 'second'])],
        ]);

        $template = $validated['template'] ?? 'tdp';
        $inspection = $validated['inspection'] ?? 'actual';
        $week = $this->resolveWeek($validated['week'] ?? null);
        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;
        $vehicleTypes = collect($validated['vehicle_types'] ?? [])
            ->map(fn ($type) => trim((string) $type))
            ->filter()
            ->unique()
            ->values();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        $checklists = $this->checklists($template, $week, $coordinatorId, $vehicleTypes);
        $latest = $checklists
            ->groupBy('unit_id')
            ->map(fn (Collection $rows) => $rows->sortByDesc('id')->first())
            ->filter()
            ->values();

        $sections = $this->sections($template, $latest, $inspection);

        $coordinatorNames = $latest
            ->map(fn (UnitChecklist $checklist) => $checklist->unit?->coordinatorUser?->name)
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $vehicleNames = $latest
            ->map(fn (UnitChecklist $checklist) => trim((string) ($checklist->unit?->vehicle_type ?? '')))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return Inertia::render('sst-board/index', [
            'sections' => $sections,
            'summary' => [
                'units' => $latest->count(),
                'week_label' => $week['label'],
                'week_number' => $week['number'],
                'coordinators' => $coordinatorNames,
                'vehicle_types' => $vehicleNames,
                'template_label' => $template === 'tdc' ? 'TDC' : 'TDP',
            ],
            'filters' => [
                'week' => $week['value'],
                'coordinator_id' => $coordinatorId,
                'vehicle_types' => $vehicleTypes->all(),
                'template' => $template,
                'inspection' => $inspection,
            ],
            'weeks' => $this->weekOptions(),
            'coordinators' => $this->coordinatorOptions($coordinatorId),
            'vehicle_options' => $this->vehicleOptions(),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    /**
     * @param  Collection<int, string>  $vehicleTypes
     * @return Collection<int, UnitChecklist>
     */
    private function checklists(string $template, array $week, ?int $coordinatorId, Collection $vehicleTypes): Collection
    {
        $query = UnitChecklist::query()
            ->with([
                'answers.item:id,item_number,parent_id',
                'unit:id,coordinator_id,vehicle_type',
                'unit.coordinatorUser:id,name',
            ])
            ->whereHas('template', fn ($builder) => $builder->where('type', $template))
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'));

        if ($week['value'] !== 'all') {
            $query->whereBetween('first_inspected_on', [$week['from'], $week['to']]);
        }

        if ($coordinatorId) {
            $query->whereHas('unit', fn ($builder) => $builder->where('coordinator_id', $coordinatorId));
        }

        if ($vehicleTypes->isNotEmpty()) {
            $query->whereHas(
                'unit',
                fn ($builder) => $builder->whereIn('vehicle_type', $vehicleTypes->all()),
            );
        }

        return $query->get();
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return list<array<string, mixed>>
     */
    private function sections(string $template, Collection $checklists, string $inspection): array
    {
        $indexed = $checklists->map(function (UnitChecklist $checklist) use ($inspection) {
            $answers = [];

            foreach ($checklist->answers as $answer) {
                $item = $answer->item;

                if ($item === null || $item->parent_id !== null) {
                    continue;
                }

                $answers[(string) $item->item_number] = $this->valueFor($checklist, $answer, $inspection);
            }

            return $answers;
        });

        return collect($this->groupDefinitions($template))
            ->map(function (array $group) use ($indexed) {
                $items = collect($group['items'])->map(function (array $item) use ($indexed) {
                    $ok = 0;
                    $falta = 0;
                    $baja = 0;

                    foreach ($indexed as $answers) {
                        $value = $answers[$item['number']] ?? null;

                        if ($value === 'yes') {
                            $ok++;
                        } elseif ($value === 'no') {
                            $falta++;
                        } else {
                            $baja++;
                        }
                    }

                    $total = $ok + $falta + $baja;

                    return [
                        'key' => $item['number'],
                        'label' => $item['label'],
                        'ok' => $ok,
                        'baja' => $baja,
                        'falta' => $falta,
                        'total' => $total,
                        'percent' => $total > 0 ? (int) round(($ok / $total) * 100) : 0,
                    ];
                })->all();

                return [
                    'key' => $group['key'],
                    'title' => $group['title'],
                    'items' => $items,
                ];
            })
            ->all();
    }

    private function valueFor(UnitChecklist $checklist, UnitChecklistAnswer $answer, string $inspection): ?string
    {
        if ($inspection === 'first') {
            return $answer->first_value;
        }

        if ($inspection === 'second') {
            return $answer->second_value;
        }

        return $checklist->second_result !== null
            ? $answer->second_value
            : $answer->first_value;
    }

    /**
     * @return list<array{key: string, title: string, items: list<array{number: string, label: string}>}>
     */
    private function groupDefinitions(string $template): array
    {
        $otros = $template === 'tdc'
            ? [
                ['number' => '3', 'label' => 'SCTR'],
                ['number' => '8', 'label' => 'Llantas'],
                ['number' => '9', 'label' => 'Llanta de repuesto'],
                ['number' => '15', 'label' => 'Conos o triángulos'],
            ]
            : [
                ['number' => '3', 'label' => 'SCTR'],
                ['number' => '29', 'label' => 'Herramientas'],
                ['number' => '30', 'label' => 'Productos químicos'],
                ['number' => '20', 'label' => 'Martillos'],
            ];

        return [
            [
                'key' => 'mtc',
                'title' => 'Requisitos solicitados por MTC',
                'items' => [
                    ['number' => '1', 'label' => 'Tarjeta de propiedad'],
                    ['number' => '2', 'label' => 'SOAT'],
                    ['number' => '4', 'label' => 'Inspección técnica vehicular'],
                ],
            ],
            [
                'key' => 'sst',
                'title' => 'Requisitos de ley de SST',
                'items' => [
                    ['number' => '14', 'label' => 'Extintor'],
                    ['number' => '18', 'label' => 'Cinturón'],
                    ['number' => '13', 'label' => 'Botiquín'],
                ],
            ],
            [
                'key' => 'otros',
                'title' => 'Otros requisitos',
                'items' => $otros,
            ],
        ];
    }

    /**
     * @return array{value: string, label: string, number: int|null, from: string|null, to: string|null}
     */
    private function resolveWeek(?string $requested): array
    {
        if ($requested === 'all') {
            return [
                'value' => 'all',
                'label' => 'Todas las semanas',
                'number' => null,
                'from' => null,
                'to' => null,
            ];
        }

        $monday = $this->mondayOf($requested) ?? now()->startOfWeek(Carbon::MONDAY);

        return $this->weekPayload($monday);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function weekOptions(): array
    {
        $dates = UnitChecklist::query()
            ->whereNotNull('first_inspected_on')
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->pluck('first_inspected_on');

        $mondays = $dates
            ->map(fn ($date) => Carbon::parse($date)->startOfWeek(Carbon::MONDAY)->toDateString())
            ->push(now()->startOfWeek(Carbon::MONDAY)->toDateString())
            ->unique()
            ->sortDesc()
            ->take(16)
            ->values();

        $options = [[
            'value' => 'all',
            'label' => 'Todas las semanas',
        ]];

        foreach ($mondays as $monday) {
            $payload = $this->weekPayload(Carbon::parse($monday));
            $options[] = [
                'value' => $payload['value'],
                'label' => $payload['label'],
            ];
        }

        return $options;
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}
     */
    private function weekPayload(CarbonInterface $monday): array
    {
        $start = Carbon::parse($monday)->startOfDay();
        $end = $start->copy()->addDays(6);

        return [
            'value' => $start->toDateString(),
            'label' => 'Semana '.$start->isoWeek().' · '.$start->format('d/m').' al '.$end->format('d/m'),
            'number' => $start->isoWeek(),
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
        ];
    }

    private function mondayOf(?string $value): ?Carbon
    {
        if ($value === null || $value === '' || $value === 'all') {
            return null;
        }

        try {
            return Carbon::parse($value)->startOfWeek(Carbon::MONDAY);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function coordinatorOptions(?int $forcedId): array
    {
        $coordinators = SystemRoles::coordinators();

        if ($forcedId) {
            $coordinators = $coordinators->where('id', $forcedId)->values();
        }

        return $coordinators
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    private function vehicleOptions(): array
    {
        return Unit::query()
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->whereNotNull('vehicle_type')
            ->where('vehicle_type', '!=', '')
            ->distinct()
            ->orderBy('vehicle_type')
            ->pluck('vehicle_type')
            ->map(fn ($type) => (string) $type)
            ->all();
    }
}
