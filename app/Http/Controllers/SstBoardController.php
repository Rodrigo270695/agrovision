<?php

namespace App\Http\Controllers;

use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use App\Support\ReportPeriod;
use App\Support\SystemRoles;
use Illuminate\Http\Request;
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
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'coordinator_id' => ['nullable', 'integer'],
            'inspector_id' => ['nullable', 'integer'],
            'vehicle_types' => ['nullable', 'array'],
            'vehicle_types.*' => ['string', 'max:80'],
            'template' => ['nullable', 'string', 'max:50', Rule::exists('checklist_templates', 'type')->where('is_active', true)],
            'inspection' => ['nullable', Rule::in(['actual', 'first', 'second'])],
        ]);

        $template = $validated['template'] ?? 'tdp';
        $inspection = $validated['inspection'] ?? 'actual';
        $range = ReportPeriod::range($validated['date_from'] ?? null, $validated['date_to'] ?? null);
        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;
        $inspectorId = isset($validated['inspector_id'])
            ? (int) $validated['inspector_id']
            : null;
        $vehicleTypes = collect($validated['vehicle_types'] ?? [])
            ->map(fn ($type) => trim((string) $type))
            ->filter()
            ->unique()
            ->values();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        $checklists = $this->checklists($template, $range, $coordinatorId, $vehicleTypes, $inspectorId);
        $latest = $checklists
            ->groupBy('unit_id')
            ->map(fn (Collection $rows) => $rows->sortByDesc('id')->first())
            ->filter()
            ->values();

        $items = $this->items($template, $latest, $inspection);

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
            'items' => $items,
            'summary' => [
                'units' => $latest->count(),
                'week_label' => $range['label'],
                'coordinators' => $coordinatorNames,
                'vehicle_types' => $vehicleNames,
                'template_label' => ChecklistTemplate::query()->where('type', $template)->first()?->displayLabel()
                    ?? mb_strtoupper($template),
            ],
            'filters' => [
                'date_from' => $range['from'],
                'date_to' => $range['to'],
                'coordinator_id' => $coordinatorId,
                'inspector_id' => $inspectorId,
                'vehicle_types' => $vehicleTypes->all(),
                'template' => $template,
                'inspection' => $inspection,
            ],
            'coordinators' => $this->coordinatorOptions($coordinatorId),
            'inspectors' => $this->inspectorOptions(),
            'vehicle_options' => $this->vehicleOptions(),
            'templateOptions' => ChecklistTemplate::options(),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    /**
     * @param  Collection<int, string>  $vehicleTypes
     * @return Collection<int, UnitChecklist>
     */
    private function checklists(string $template, array $range, ?int $coordinatorId, Collection $vehicleTypes, ?int $inspectorId): Collection
    {
        $query = UnitChecklist::query()
            ->with([
                'answers.item:id,item_number,parent_id',
                'unit:id,coordinator_id,vehicle_type',
                'unit.coordinatorUser:id,name',
            ])
            ->whereHas('template', fn ($builder) => $builder->where('type', $template))
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'));

        if ($range['from'] !== null && $range['to'] !== null) {
            $query->whereBetween('first_inspected_on', [$range['from'], $range['to']]);
        }

        if ($coordinatorId) {
            $query->whereHas('unit', fn ($builder) => $builder->where('coordinator_id', $coordinatorId));
        }

        if ($inspectorId) {
            $query->where('created_by', $inspectorId);
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
    private function items(string $template, Collection $checklists, string $inspection): array
    {
        $templateId = ChecklistTemplate::query()->where('type', $template)->value('id');
        $parents = ChecklistItem::query()
            ->where('template_id', $templateId)
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get(['item_number', 'label']);

        $indexed = $checklists->map(function (UnitChecklist $checklist) use ($inspection) {
            $answers = [];

            foreach ($checklist->answers as $answer) {
                $item = $answer->item;

                if ($item === null || $item->parent_id !== null || $item->item_number === null) {
                    continue;
                }

                $answers[(string) $item->item_number] = $this->valueFor($checklist, $answer, $inspection);
            }

            return $answers;
        });

        return $parents
            ->filter(fn (ChecklistItem $item) => filled($item->item_number))
            ->map(function (ChecklistItem $item) use ($indexed) {
                $number = (string) $item->item_number;
                $ok = 0;
                $falta = 0;
                $baja = 0;

                foreach ($indexed as $answers) {
                    $value = $answers[$number] ?? null;

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
                    'key' => $number,
                    'label' => trim((string) $item->label),
                    'ok' => $ok,
                    'baja' => $baja,
                    'falta' => $falta,
                    'total' => $total,
                    'percent' => $total > 0 ? (int) round(($ok / $total) * 100) : 0,
                ];
            })
            ->values()
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
     * @return list<array{id: int, name: string}>
     */
    private function inspectorOptions(): array
    {
        return SystemRoles::inspectors()
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
