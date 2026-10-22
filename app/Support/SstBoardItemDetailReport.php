<?php

namespace App\Support;

use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class SstBoardItemDetailReport
{
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  list<string>  $vehicleTypes
     * @return array{
     *     item: array{key: string, label: string},
     *     summary: array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int},
     *     bars: list<array{
     *         label: string,
     *         week: int,
     *         year: int,
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

        $periodData = $this->loadPeriodData(
            $periods,
            $templateType,
            $itemNumber,
            $coordinatorId,
            $vehicleTypes,
            $inspectorId,
            $inspection,
            $activeParentIds,
        );

        $summary = $this->unifiedSummary($periodData);
        $bars = $this->weeklyBars($range, $periods, $periodData);

        $templateLabel = ChecklistTemplate::query()->where('type', $templateType)->first()?->displayLabel()
            ?? mb_strtoupper($templateType);

        return [
            'item' => [
                'key' => $itemNumber,
                'label' => trim((string) $item->label),
            ],
            'summary' => $summary,
            'bars' => $bars,
            'source_label' => sprintf(
                'Base de datos de %s actualizada · %s',
                $templateLabel,
                $range['label'],
            ),
        ];
    }

    /**
     * @param  Collection<int, Period>  $periods
     * @param  Collection<int, int>  $activeParentIds
     * @return list<array{
     *     period: Period,
     *     units: Collection<int, Unit>,
     *     checklists: Collection<int|string, UnitChecklist>,
     *     rows: list<array{unit: Unit, status: string}>
     * }>
     */
    private function loadPeriodData(
        Collection $periods,
        string $templateType,
        string $itemNumber,
        ?int $coordinatorId,
        Collection $vehicleTypes,
        ?int $inspectorId,
        string $inspection,
        Collection $activeParentIds,
    ): array {
        $loaded = [];

        foreach ($periods as $period) {
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

            $rows = [];

            foreach ($units as $unit) {
                $rows[] = [
                    'unit' => $unit,
                    'status' => $this->classify(
                        $unit,
                        $checklists->get($unit->id),
                        $itemNumber,
                        $inspection,
                        $activeParentIds,
                    ),
                ];
            }

            $loaded[] = [
                'period' => $period,
                'units' => $units,
                'checklists' => $checklists,
                'rows' => $rows,
            ];
        }

        return $loaded;
    }

    /**
     * @param  list<array{period: Period, units: Collection<int, Unit>, checklists: Collection<int|string, UnitChecklist>, rows: list<array{unit: Unit, status: string}>}>  $periodData
     * @return array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int}
     */
    private function unifiedSummary(array $periodData): array
    {
        $byPlate = [];

        foreach ($periodData as $chunk) {
            $period = $chunk['period'];
            $periodStamp = $period->date?->getTimestamp() ?? 0;

            foreach ($chunk['rows'] as $row) {
                $key = $this->plateKey($row['unit']);
                $current = $byPlate[$key] ?? null;

                if ($current === null || $periodStamp >= $current['stamp']) {
                    $byPlate[$key] = [
                        'stamp' => $periodStamp,
                        'status' => $row['status'],
                    ];
                }
            }
        }

        $counts = [
            'ok' => 0,
            'falta' => 0,
            'baja' => 0,
            'pendiente' => 0,
        ];

        foreach ($byPlate as $entry) {
            $counts[$entry['status']]++;
        }

        $total = array_sum($counts);

        return [
            ...$counts,
            'total' => $total,
            'percent' => $total > 0 ? (int) round(($counts['ok'] / $total) * 100) : 0,
        ];
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  Collection<int, Period>  $periods
     * @param  list<array{period: Period, units: Collection<int, Unit>, checklists: Collection<int|string, UnitChecklist>, rows: list<array{unit: Unit, status: string}>}>  $periodData
     * @return list<array{label: string, week: int, year: int, ok: int, falta: int, baja: int, pendiente: int, total: int, percent_ok: int}>
     */
    private function weeklyBars(array $range, Collection $periods, array $periodData): array
    {
        if ($periodData === []) {
            return [];
        }

        $from = $range['from'] !== null ? CarbonImmutable::parse($range['from']) : null;
        $to = $range['to'] !== null ? CarbonImmutable::parse($range['to']) : null;

        /** @var array<string, array{label: string, week: int, year: int, sort: int, by_plate: array<string, string>}> $buckets */
        $buckets = [];

        foreach ($periodData as $chunk) {
            $period = $chunk['period'];
            $checklists = $chunk['checklists'];

            if (! $this->periodTouchesRange($period, $checklists, $from, $to)) {
                continue;
            }

            $anchor = $this->periodWeekAnchor($period, $checklists);

            if ($anchor === null) {
                continue;
            }

            $week = (int) $anchor->isoWeek();
            $year = (int) $anchor->isoWeekYear();
            $bucketKey = sprintf('%04d-%02d', $year, $week);

            if (! isset($buckets[$bucketKey])) {
                $buckets[$bucketKey] = [
                    'label' => 'Semana '.$week,
                    'week' => $week,
                    'year' => $year,
                    'sort' => (int) $anchor->startOfWeek()->format('Ymd'),
                    'by_plate' => [],
                ];
            }

            foreach ($chunk['rows'] as $row) {
                $buckets[$bucketKey]['by_plate'][$this->plateKey($row['unit'])] = $row['status'];
            }
        }

        $bars = [];

        foreach ($buckets as $bucket) {
            $counts = [
                'ok' => 0,
                'falta' => 0,
                'baja' => 0,
                'pendiente' => 0,
            ];

            foreach ($bucket['by_plate'] as $status) {
                $counts[$status]++;
            }

            $total = array_sum($counts);

            if ($total === 0) {
                continue;
            }

            $bars[] = [
                'label' => $bucket['label'],
                'week' => $bucket['week'],
                'year' => $bucket['year'],
                'sort' => $bucket['sort'],
                'ok' => $counts['ok'],
                'falta' => $counts['falta'],
                'baja' => $counts['baja'],
                'pendiente' => $counts['pendiente'],
                'total' => $total,
                'percent_ok' => (int) round(($counts['ok'] / $total) * 100),
            ];
        }

        usort($bars, fn (array $left, array $right) => $left['sort'] <=> $right['sort']);

        return array_map(function (array $bar) {
            unset($bar['sort']);

            return $bar;
        }, $bars);
    }

    /**
     * @param  Collection<int|string, UnitChecklist>  $checklists
     */
    private function periodWeekAnchor(Period $period, Collection $checklists): ?CarbonImmutable
    {
        $latestInspection = $checklists
            ->map(fn (UnitChecklist $checklist) => $checklist->first_inspected_on)
            ->filter()
            ->max();

        if ($latestInspection !== null) {
            return CarbonImmutable::parse($latestInspection);
        }

        if ($period->date !== null) {
            return CarbonImmutable::parse($period->date);
        }

        return null;
    }

    /**
     * @param  Collection<int|string, UnitChecklist>  $checklists
     */
    private function periodTouchesRange(
        Period $period,
        Collection $checklists,
        ?CarbonImmutable $from,
        ?CarbonImmutable $to,
    ): bool {
        if ($from === null || $to === null) {
            return true;
        }

        if ($period->date !== null && $period->date->betweenIncluded($from, $to)) {
            return true;
        }

        foreach ($checklists as $checklist) {
            $inspected = $checklist->first_inspected_on;

            if ($inspected !== null && $inspected->betweenIncluded($from, $to)) {
                return true;
            }
        }

        return false;
    }

    /**
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
                $builder->whereBetween('date', [$from, $to]);

                if ($periodIdsFromInspections->isNotEmpty()) {
                    $builder->orWhereIn('id', $periodIdsFromInspections);
                }
            })
            ->whereHas('units')
            ->get();
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return Collection<int, Unit>
     */
    private function uniqueUnits(Collection $units): Collection
    {
        $seen = [];

        return $units->filter(function (Unit $unit) use (&$seen) {
            $key = $this->plateKey($unit);

            if (isset($seen[$key])) {
                return false;
            }

            $seen[$key] = true;

            return true;
        })->values();
    }

    private function plateKey(Unit $unit): string
    {
        $plate = mb_strtoupper(trim((string) $unit->plate_number));

        return $plate !== '' ? $plate : 'unit-'.$unit->id;
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
}
