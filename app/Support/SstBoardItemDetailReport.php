<?php

namespace App\Support;

use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use Illuminate\Support\Collection;

final class SstBoardItemDetailReport
{
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  list<string>  $vehicleTypes
     * @return array{
     *     item: array{key: string, label: string},
     *     summary: array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int},
     *     weeks: list<array{
     *         period_id: int,
     *         label: string,
     *         date: string|null,
     *         ok: int,
     *         falta: int,
     *         baja: int,
     *         pendiente: int,
     *         total: int,
     *         percent_ok: int
     *     }>,
     *     source_label: string
     * }
     */
    public function build(
        string $templateType,
        string $itemNumber,
        array $range,
        ?int $coordinatorId,
        Collection $vehicleTypes,
        ?int $inspectorId,
        string $inspection,
    ): array {
        $templateId = ChecklistTemplate::query()->where('type', $templateType)->value('id');
        $parents = ChecklistItem::activeParentsForTemplateId($templateId);
        $item = $parents->first(fn (ChecklistItem $row) => (string) $row->item_number === $itemNumber);

        if ($item === null) {
            abort(404, 'Ítem no encontrado en la plantilla activa.');
        }

        $activeParentIds = $parents->pluck('id')->flip();
        $periods = $this->periodsInRange(
            $range,
            $templateType,
            $coordinatorId,
            $vehicleTypes,
            $inspectorId,
        );

        $weeks = [];
        $summary = [
            'ok' => 0,
            'falta' => 0,
            'baja' => 0,
            'pendiente' => 0,
            'total' => 0,
            'percent' => 0,
        ];

        foreach ($periods as $period) {
            $bucket = $this->bucketForPeriod(
                $period,
                $templateType,
                $itemNumber,
                $coordinatorId,
                $vehicleTypes,
                $inspectorId,
                $inspection,
                $activeParentIds,
            );

            $weeks[] = [
                'period_id' => (int) $period->id,
                'label' => $this->periodLabel($period),
                'date' => $period->date?->toDateString(),
                'ok' => $bucket['ok'],
                'falta' => $bucket['falta'],
                'baja' => $bucket['baja'],
                'pendiente' => $bucket['pendiente'],
                'total' => $bucket['total'],
                'percent_ok' => $bucket['percent_ok'],
            ];

            foreach (['ok', 'falta', 'baja', 'pendiente', 'total'] as $key) {
                $summary[$key] += $bucket[$key];
            }
        }

        $summary['percent'] = $summary['total'] > 0
            ? (int) round(($summary['ok'] / $summary['total']) * 100)
            : 0;

        $templateLabel = ChecklistTemplate::query()->where('type', $templateType)->first()?->displayLabel()
            ?? mb_strtoupper($templateType);

        return [
            'item' => [
                'key' => $itemNumber,
                'label' => trim((string) $item->label),
            ],
            'summary' => $summary,
            'weeks' => $weeks,
            'source_label' => sprintf(
                'Base de datos de %s · %s',
                $templateLabel,
                $range['label'],
            ),
        ];
    }

    /**
     * Periodos de la planilla en el rango: por fecha del periodo o con inspecciones en el rango.
     *
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  list<string>  $vehicleTypes
     * @return Collection<int, Period>
     */
    private function periodsInRange(
        array $range,
        string $templateType,
        ?int $coordinatorId,
        Collection $vehicleTypes,
        ?int $inspectorId,
    ): Collection {
        $query = Period::query()->orderBy('date');

        if ($range['from'] === null || $range['to'] === null) {
            return $query->whereHas('units')->get();
        }

        $from = $range['from'];
        $to = $range['to'];

        $periodIdsFromInspections = UnitChecklist::query()
            ->whereHas('template', fn ($builder) => $builder->where('type', $templateType))
            ->whereBetween('first_inspected_on', [$from, $to])
            ->when($inspectorId, fn ($builder) => $builder->where('created_by', $inspectorId))
            ->when($coordinatorId, fn ($builder) => $builder->whereHas(
                'unit',
                fn ($unit) => $unit->where('coordinator_id', $coordinatorId),
            ))
            ->when(
                $vehicleTypes->isNotEmpty(),
                fn ($builder) => $builder->whereHas(
                    'unit',
                    fn ($unit) => $unit->whereIn('vehicle_type', $vehicleTypes->all()),
                ),
            )
            ->distinct()
            ->pluck('period_id');

        return $query
            ->where(function ($builder) use ($from, $to, $periodIdsFromInspections) {
                $builder
                    ->whereBetween('date', [$from, $to]);

                if ($periodIdsFromInspections->isNotEmpty()) {
                    $builder->orWhereIn('id', $periodIdsFromInspections);
                }
            })
            ->whereHas('units')
            ->get();
    }

    /**
     * @param  list<string>  $vehicleTypes
     * @param  Collection<int, int>  $activeParentIds
     * @return array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent_ok: int}
     */
    private function bucketForPeriod(
        Period $period,
        string $templateType,
        string $itemNumber,
        ?int $coordinatorId,
        Collection $vehicleTypes,
        ?int $inspectorId,
        string $inspection,
        Collection $activeParentIds,
    ): array {
        $units = Unit::query()
            ->where('period_id', $period->id)
            ->when($coordinatorId, fn ($query) => $query->where('coordinator_id', $coordinatorId))
            ->when(
                $vehicleTypes->isNotEmpty(),
                fn ($query) => $query->whereIn('vehicle_type', $vehicleTypes->all()),
            )
            ->orderBy('id')
            ->get(['id', 'period_id', 'plate_number', 'status']);

        $units = $this->uniqueUnits($units);

        $checklists = UnitChecklist::query()
            ->with(['answers.item:id,item_number,parent_id,pareto_id'])
            ->where('period_id', $period->id)
            ->whereHas('template', fn ($builder) => $builder->where('type', $templateType))
            ->when($inspectorId, fn ($query) => $query->where('created_by', $inspectorId))
            ->whereIn('unit_id', $units->pluck('id')->all())
            ->get()
            ->groupBy('unit_id')
            ->map(fn (Collection $rows) => $rows->sortByDesc('id')->first());

        $counts = [
            'ok' => 0,
            'falta' => 0,
            'baja' => 0,
            'pendiente' => 0,
        ];

        foreach ($units as $unit) {
            $status = $this->classify(
                $unit,
                $checklists->get($unit->id),
                $itemNumber,
                $inspection,
                $activeParentIds,
            );
            $counts[$status]++;
        }

        $total = array_sum($counts);

        return [
            ...$counts,
            'total' => $total,
            'percent_ok' => $total > 0 ? (int) round(($counts['ok'] / $total) * 100) : 0,
        ];
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return Collection<int, Unit>
     */
    private function uniqueUnits(Collection $units): Collection
    {
        $seen = [];

        return $units->filter(function (Unit $unit) use (&$seen) {
            $plate = mb_strtoupper(trim((string) $unit->plate_number));
            $key = $plate !== '' ? $plate : 'unit-'.$unit->id;

            if (isset($seen[$key])) {
                return false;
            }

            $seen[$key] = true;

            return true;
        })->values();
    }

    /**
     * @param  Collection<int, int>  $activeParentIds
     * @return 'ok'|'falta'|'baja'|'pendiente'
     */
    private function classify(
        Unit $unit,
        ?UnitChecklist $checklist,
        string $itemNumber,
        string $inspection,
        Collection $activeParentIds,
    ): string {
        if (($unit->status ?? 'active') !== 'active') {
            return 'baja';
        }

        if ($checklist === null || ! $this->inspectionIsClosed($checklist, $inspection)) {
            return 'pendiente';
        }

        $value = $this->itemValue($checklist, $itemNumber, $inspection, $activeParentIds);

        if ($value === 'yes') {
            return 'ok';
        }

        if ($value === 'no') {
            return 'falta';
        }

        return 'baja';
    }

    private function inspectionIsClosed(UnitChecklist $checklist, string $inspection): bool
    {
        if ($inspection === 'first') {
            return in_array($checklist->first_result, ['approved', 'rejected'], true);
        }

        if ($inspection === 'second') {
            return in_array($checklist->second_result, ['approved', 'rejected'], true);
        }

        return in_array($checklist->second_result ?? $checklist->first_result, ['approved', 'rejected'], true);
    }

    /**
     * @param  Collection<int, int>  $activeParentIds
     */
    private function itemValue(
        UnitChecklist $checklist,
        string $itemNumber,
        string $inspection,
        Collection $activeParentIds,
    ): ?string {
        foreach ($checklist->answers as $answer) {
            $item = $answer->item;

            if ($item === null || $item->parent_id !== null) {
                continue;
            }

            if ((string) $item->item_number !== $itemNumber) {
                continue;
            }

            if (! $activeParentIds->has($item->id)) {
                return null;
            }

            return $this->valueFor($checklist, $answer, $inspection);
        }

        return null;
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

    private function periodLabel(Period $period): string
    {
        $name = trim((string) $period->name);

        if ($name !== '') {
            return $name;
        }

        return $period->date?->format('d/m/Y') ?? 'Periodo #'.$period->id;
    }
}
