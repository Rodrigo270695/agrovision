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
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class SstBoardItemDetailReport
{
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  list<string>  $vehicleTypes
     * @return array{
     *     item: array{key: string, label: string},
     *     summary: array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int},
     *     units_by_status: array{
     *         ok: list<array<string, mixed>>,
     *         falta: list<array<string, mixed>>,
     *         baja: list<array<string, mixed>>,
     *         pendiente: list<array<string, mixed>>
     *     },
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

        $grouped = $this->unitsGroupedForRange($range, $periodData);
        $summary = $this->summaryFromGrouped($grouped);
        $bars = $this->weeklyBars($range, $periods, $periodData);

        $templateLabel = ChecklistTemplate::query()->where('type', $templateType)->first()?->displayLabel()
            ?? mb_strtoupper($templateType);

        return [
            'item' => [
                'key' => $itemNumber,
                'label' => trim((string) $item->label),
            ],
            'summary' => $summary,
            'units_by_status' => [
                'ok' => $grouped['ok'],
                'falta' => $grouped['falta'],
                'baja' => $grouped['baja'],
                'pendiente' => $grouped['pendiente'],
            ],
            'bars' => $bars,
            'source_label' => sprintf(
                'Base de datos de %s actualizada · %s',
                $templateLabel,
                $range['label'],
            ),
        ];
    }

    /**
     * @param  'ok'|'falta'|'baja'|'pendiente'  $status
     * @return list<array<string, mixed>>
     */
    public function unitsForStatus(
        string $templateType,
        string $itemNumber,
        array $range,
        ?int $coordinatorId,
        Collection $vehicleTypes,
        ?int $inspectorId,
        string $inspection,
        string $status,
    ): array {
        $report = $this->build(
            $templateType,
            $itemNumber,
            $range,
            $coordinatorId,
            $vehicleTypes,
            $inspectorId,
            $inspection,
        );

        return $report['units_by_status'][$status] ?? [];
    }

    /**
     * @param  list<array<string, mixed>>  $units
     */
    public function downloadUnitsExcel(
        array $units,
        string $itemLabel,
        string $statusLabel,
        string $rangeLabel,
    ): StreamedResponse {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Agrovision')
            ->setTitle("Tablero SST — {$itemLabel} — {$statusLabel}");

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($statusLabel, 0, 31));

        $headers = [
            'Estado ítem',
            'Placa',
            'Correlativo',
            'Conductor',
            'DNI',
            'Proveedor',
            'T. vehículo',
            'Sede',
            'Garita',
            'Estado unidad',
            'Coordinador',
            'Periodo',
            'Fecha actividad',
        ];

        $sheet->mergeCells('A1:M1');
        $sheet->setCellValue('A1', "{$itemLabel} · {$statusLabel} · {$rangeLabel}");
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(24);

        foreach ($headers as $index => $header) {
            $column = $index + 1;
            $sheet->setCellValue([$column, 2], $header);
            $sheet->getStyle([$column, 2])->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2E5A9E'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getColumnDimensionByColumn($column)->setWidth(
                match ($index) {
                    0 => 14,
                    1 => 12,
                    2 => 14,
                    3 => 28,
                    4 => 12,
                    5 => 36,
                    6 => 14,
                    7 => 16,
                    8 => 14,
                    9 => 14,
                    10 => 22,
                    11 => 18,
                    default => 14,
                },
            );
        }

        foreach ($units as $index => $unit) {
            $row = $index + 3;
            $sheet->fromArray([
                $statusLabel,
                $unit['plate_number'] ?? '',
                $unit['correlative'] ?? '',
                $unit['driver_name'] ?? '',
                $unit['driver_dni'] ?? '',
                $unit['provider'] ?? '',
                $unit['vehicle_type'] ?? '',
                $unit['sede'] ?? '',
                $unit['garita'] ?? '',
                $unit['unit_status'] ?? '',
                $unit['coordinator'] ?? '',
                $unit['period_name'] ?? '',
                isset($unit['activity_date']) && $unit['activity_date']
                    ? CarbonImmutable::parse($unit['activity_date'])->format('d/m/Y')
                    : '',
            ], null, "A{$row}");
        }

        $slug = str($statusLabel)->slug('')->toString() ?: 'estado';
        $filename = 'tablero-sst-'.str($itemLabel)->slug()->toString()."-{$slug}-".now()->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
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
                ->with(['coordinatorUser:id,name', 'period:id,name,date'])
                ->orderBy('id')
                ->get([
                    'id',
                    'period_id',
                    'correlative',
                    'plate_number',
                    'driver_name',
                    'driver_dni',
                    'provider',
                    'vehicle_type',
                    'sede',
                    'garita',
                    'status',
                    'coordinator_id',
                ]);

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
     * Unidades del rango agrupadas por estado del ítem (placa única, última actividad).
     *
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  list<array{period: Period, units: Collection<int, Unit>, checklists: Collection<int|string, UnitChecklist>, rows: list<array{unit: Unit, status: string}>}>  $periodData
     * @return array{
     *     ok: list<array<string, mixed>>,
     *     falta: list<array<string, mixed>>,
     *     baja: list<array<string, mixed>>,
     *     pendiente: list<array<string, mixed>>
     * }
     */
    private function unitsGroupedForRange(array $range, array $periodData): array
    {
        $from = $range['from'] !== null
            ? CarbonImmutable::parse($range['from'])->startOfDay()
            : null;
        $to = $range['to'] !== null
            ? CarbonImmutable::parse($range['to'])->endOfDay()
            : null;

        $byPlate = [];

        foreach ($periodData as $chunk) {
            $period = $chunk['period'];

            foreach ($chunk['rows'] as $row) {
                $checklist = $chunk['checklists']->get($row['unit']->id);
                $dates = $this->activityDates($period, $checklist);

                if ($from !== null && $to !== null) {
                    $dates = array_values(array_filter(
                        $dates,
                        fn (CarbonImmutable $date) => $date->betweenIncluded($from, $to),
                    ));

                    if ($dates === []) {
                        continue;
                    }
                }

                $latest = collect($dates)->max();
                $stamp = $latest instanceof CarbonImmutable ? $latest->getTimestamp() : 0;
                $key = $this->plateKey($row['unit']);
                $current = $byPlate[$key] ?? null;

                if ($current === null || $stamp >= $current['stamp']) {
                    $byPlate[$key] = [
                        'stamp' => $stamp,
                        'status' => $row['status'],
                        'unit' => $this->serializeUnit($row['unit'], $row['status'], $latest),
                    ];
                }
            }
        }

        $grouped = [
            'ok' => [],
            'falta' => [],
            'baja' => [],
            'pendiente' => [],
        ];

        foreach ($byPlate as $entry) {
            $grouped[$entry['status']][] = $entry['unit'];
        }

        foreach ($grouped as $status => $rows) {
            usort($grouped[$status], function (array $a, array $b): int {
                return strcmp(
                    (string) ($a['plate_number'] ?? ''),
                    (string) ($b['plate_number'] ?? ''),
                );
            });
        }

        return $grouped;
    }

    /**
     * @param  array{
     *     ok: list<array<string, mixed>>,
     *     falta: list<array<string, mixed>>,
     *     baja: list<array<string, mixed>>,
     *     pendiente: list<array<string, mixed>>
     * }  $grouped
     * @return array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int}
     */
    private function summaryFromGrouped(array $grouped): array
    {
        $counts = [
            'ok' => count($grouped['ok']),
            'falta' => count($grouped['falta']),
            'baja' => count($grouped['baja']),
            'pendiente' => count($grouped['pendiente']),
        ];
        $total = array_sum($counts);

        return [
            ...$counts,
            'total' => $total,
            'percent' => $total > 0 ? (int) round(($counts['ok'] / $total) * 100) : 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUnit(Unit $unit, string $itemStatus, ?CarbonImmutable $activityDate): array
    {
        return [
            'id' => $unit->id,
            'correlative' => $unit->correlative,
            'plate_number' => $unit->plate_number,
            'driver_name' => $unit->driver_name,
            'driver_dni' => $unit->driver_dni,
            'provider' => $unit->provider,
            'vehicle_type' => $unit->vehicle_type,
            'sede' => $unit->sede,
            'garita' => $unit->garita,
            'unit_status' => ($unit->status ?? 'active') === 'active' ? 'Activo' : 'Inactivo',
            'item_status' => $itemStatus,
            'coordinator' => $unit->coordinatorUser?->name,
            'period_name' => $unit->period?->name,
            'activity_date' => $activityDate?->format('Y-m-d'),
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
        [$from, $to] = $this->barChartBounds($range, $periodData);

        if ($from === null || $to === null) {
            return [];
        }

        $bars = [];
        $cursor = $from->copy()->startOfWeek();
        $end = $to->copy()->endOfWeek();

        while ($cursor <= $end) {
            $weekStart = $cursor->copy()->startOfWeek();
            $weekEnd = $cursor->copy()->endOfWeek();
            $byPlate = [];

            foreach ($periodData as $chunk) {
                $period = $chunk['period'];

                foreach ($chunk['rows'] as $row) {
                    $checklist = $chunk['checklists']->get($row['unit']->id);

                    foreach ($this->activityDates($period, $checklist) as $date) {
                        if ($date->betweenIncluded($weekStart, $weekEnd)) {
                            $byPlate[$this->plateKey($row['unit'])] = $row['status'];
                        }
                    }
                }
            }

            $counts = [
                'ok' => 0,
                'falta' => 0,
                'baja' => 0,
                'pendiente' => 0,
            ];

            foreach ($byPlate as $status) {
                $counts[$status]++;
            }

            $total = array_sum($counts);

            if ($total > 0) {
                $bars[] = [
                    'label' => 'Semana '.(int) $weekStart->isoWeek(),
                    'week' => (int) $weekStart->isoWeek(),
                    'year' => (int) $weekStart->isoWeekYear(),
                    'ok' => $counts['ok'],
                    'falta' => $counts['falta'],
                    'baja' => $counts['baja'],
                    'pendiente' => $counts['pendiente'],
                    'total' => $total,
                    'percent_ok' => (int) round(($counts['ok'] / $total) * 100),
                ];
            }

            $cursor = $cursor->addWeek();
        }

        return $bars;
    }

    /**
     * @return list<CarbonImmutable>
     */
    private function activityDates(Period $period, ?UnitChecklist $checklist): array
    {
        $dates = [];

        if ($period->date !== null) {
            $dates[] = CarbonImmutable::parse($period->date)->startOfDay();
        }

        if ($checklist?->first_inspected_on !== null) {
            $dates[] = CarbonImmutable::parse($checklist->first_inspected_on)->startOfDay();
        }

        return $dates;
    }

    /**
     * @param  list<array{period: Period, units: Collection<int, Unit>, checklists: Collection<int|string, UnitChecklist>, rows: list<array{unit: Unit, status: string}>}>  $periodData
     * @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null}
     */
    private function barChartBounds(array $range, array $periodData): array
    {
        if ($range['from'] !== null && $range['to'] !== null) {
            return [
                CarbonImmutable::parse($range['from']),
                CarbonImmutable::parse($range['to']),
            ];
        }

        $dates = [];

        foreach ($periodData as $chunk) {
            if ($chunk['period']->date !== null) {
                $dates[] = CarbonImmutable::parse($chunk['period']->date);
            }

            foreach ($chunk['checklists'] as $checklist) {
                if ($checklist->first_inspected_on !== null) {
                    $dates[] = CarbonImmutable::parse($checklist->first_inspected_on);
                }
            }
        }

        if ($dates === []) {
            return [null, null];
        }

        return [
            collect($dates)->min(),
            collect($dates)->max(),
        ];
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
        $inactive = ($unit->status ?? 'active') !== 'active';
        $closed = $checklist !== null && $this->inspectionIsClosed($checklist, $inspection);

        if ($closed) {
            $value = $this->itemValue($checklist, $itemNumber, $inspection, $activeParentIds);

            if ($value === 'yes') {
                return 'ok';
            }

            if ($value === 'no') {
                return 'falta';
            }

            return 'baja';
        }

        if ($inactive) {
            return 'baja';
        }

        return 'pendiente';
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
