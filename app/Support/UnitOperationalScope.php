<?php

namespace App\Support;

use App\Models\ChecklistTemplate;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\VehicleType;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilderContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;

/**
 * Misma base operativa para Unidades, inspección en rango y tablero SST.
 */
final class UnitOperationalScope
{
    /**
     * @param  Builder<Unit>  $query
     */
    public static function applyActiveFilter(Builder $query): void
    {
        $query->where(function (Builder $builder): void {
            $builder->where('status', 'active')->orWhereNull('status');
        });
    }

    /**
     * Unidades con servicio en el rango (movimiento o fecha de servicio sin historial).
     *
     * @param  Builder<Unit>  $query
     */
    public static function applyServiceDateRange(
        Builder $query,
        ?string $from,
        ?string $to,
    ): void {
        if ($from === null && $to === null) {
            return;
        }

        $query->where(function (Builder $builder) use ($from, $to): void {
            $builder->whereHas('movements', function (Builder $movement) use ($from, $to): void {
                if ($from) {
                    $movement->whereDate('service_date', '>=', $from);
                }

                if ($to) {
                    $movement->whereDate('service_date', '<=', $to);
                }
            })->orWhere(function (Builder $unit) use ($from, $to): void {
                $unit->whereDoesntHave('movements');

                if ($from) {
                    $unit->whereDate('service_date', '>=', $from);
                }

                if ($to) {
                    $unit->whereDate('service_date', '<=', $to);
                }
            });
        });
    }

    /**
     * Tipos de vehículo enlazados a la plantilla en Pareto.
     *
     * @return list<string>
     */
    public static function vehicleTypeNamesForTemplate(string $templateType): array
    {
        return VehicleType::query()
            ->whereHas(
                'checklistTemplate',
                fn (Builder $builder) => $builder
                    ->where('type', $templateType)
                    ->where('is_active', true),
            )
            ->pluck('name')
            ->map(fn ($name) => mb_strtoupper(trim((string) $name)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  Builder<Unit>  $query
     */
    public static function applyTemplateVehicleFilter(
        Builder $query,
        ?string $templateType,
    ): void {
        if ($templateType === null || $templateType === '') {
            return;
        }

        $names = self::vehicleTypeNamesForTemplate($templateType);

        if ($names === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $placeholders = implode(',', array_fill(0, count($names), '?'));
        $query->whereRaw("upper(trim(vehicle_type)) in ({$placeholders})", $names);
    }

    public static function constrainChecklistBelongsToUnit(
        QueryBuilderContract $query,
        string $checklistTable,
        string $unitsTable = 'units',
    ): void {
        $query->where(function (QueryBuilderContract $match) use ($checklistTable, $unitsTable): void {
            $match->whereColumn("{$checklistTable}.unit_id", "{$unitsTable}.id")
                ->orWhere(function (QueryBuilderContract $plate) use ($checklistTable, $unitsTable): void {
                    $plate->whereNotNull("{$unitsTable}.plate_number")
                        ->where("{$unitsTable}.plate_number", '!=', '')
                        ->whereNotNull("{$checklistTable}.plate_number")
                        ->where("{$checklistTable}.plate_number", '!=', '')
                        ->whereRaw(
                            "upper(trim({$checklistTable}.plate_number)) = upper(trim({$unitsTable}.plate_number))",
                        );
                });
        });
    }

    public static function checklistBelongsToUnit(UnitChecklist $checklist, Unit $unit): bool
    {
        if ((int) $checklist->unit_id === (int) $unit->id) {
            return true;
        }

        $unitPlate = mb_strtoupper(trim((string) $unit->plate_number));
        $checklistPlate = mb_strtoupper(trim((string) $checklist->plate_number));

        return $unitPlate !== ''
            && $checklistPlate !== ''
            && $unitPlate === $checklistPlate;
    }

    public static function constrainInspectionDates(
        QueryBuilderContract $query,
        ?string $from,
        ?string $to,
        string $table,
    ): void {
        if ($from === null && $to === null) {
            $query->where(function (QueryBuilderContract $dates) use ($table): void {
                $dates->whereNotNull("{$table}.first_inspected_on")
                    ->orWhereNotNull("{$table}.second_inspected_on");
            });

            return;
        }

        if ($from) {
            $query->whereDate("{$table}.first_inspected_on", '>=', $from);
        }

        if ($to) {
            $query->whereDate("{$table}.first_inspected_on", '<=', $to);
        }
    }

    public static function constrainChecklistTemplateType(
        QueryBuilderContract $query,
        ?string $templateType,
        string $checklistTable,
    ): void {
        if ($templateType === null || $templateType === '') {
            return;
        }

        $templatesTable = (new ChecklistTemplate)->getTable();

        $query->whereIn("{$checklistTable}.template_id", function (QueryBuilder $sub) use ($templateType, $templatesTable) {
            $sub->select('id')
                ->from($templatesTable)
                ->where('type', $templateType)
                ->where('is_active', true);
        });
    }

    public static function inspectionExistsSubquery(
        ?string $from,
        ?string $to,
        ?string $templateType = null,
    ): QueryBuilder {
        $table = (new UnitChecklist)->getTable();

        return UnitChecklist::query()
            ->selectRaw('1')
            ->where(function (QueryBuilderContract $checklist) use ($table): void {
                self::constrainChecklistBelongsToUnit($checklist, $table);
            })
            ->where(function (QueryBuilderContract $checklist) use ($from, $to, $templateType, $table): void {
                self::constrainInspectionDates($checklist, $from, $to, $table);
                self::constrainChecklistTemplateType($checklist, $templateType, $table);
            })
            ->limit(1)
            ->getQuery();
    }

    public static function applyInspectionExists(
        QueryBuilder $query,
        ?string $from,
        ?string $to,
        ?string $templateType = null,
    ): void {
        $table = (new UnitChecklist)->getTable();

        $query->selectRaw('1')
            ->from($table)
            ->where(function (QueryBuilderContract $checklist) use ($table): void {
                self::constrainChecklistBelongsToUnit($checklist, $table);
            })
            ->where(function (QueryBuilderContract $checklist) use ($from, $to, $templateType, $table): void {
                self::constrainInspectionDates($checklist, $from, $to, $table);
                self::constrainChecklistTemplateType($checklist, $templateType, $table);
            });
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return Collection<int, UnitChecklist|null>
     */
    public static function resolveChecklistsForUnits(
        Collection $units,
        string $templateType,
        ?string $from,
        ?string $to,
        ?int $inspectorId = null,
    ): Collection {
        if ($units->isEmpty()) {
            return collect();
        }

        $table = (new UnitChecklist)->getTable();

        $checklists = UnitChecklist::query()
            ->with(['answers.item:id,item_number,parent_id,pareto_id'])
            ->whereHas(
                'template',
                fn (Builder $builder) => $builder->where('type', $templateType)->where('is_active', true),
            )
            ->when($inspectorId, fn (Builder $query) => $query->where('created_by', $inspectorId))
            ->where(function (Builder $query) use ($from, $to, $table): void {
                self::constrainInspectionDates($query, $from, $to, $table);
            })
            ->orderByDesc('first_inspected_on')
            ->orderByDesc('id')
            ->get();

        return $units->mapWithKeys(function (Unit $unit) use ($checklists) {
            $match = $checklists
                ->first(fn (UnitChecklist $checklist) => self::checklistBelongsToUnit($checklist, $unit));

            return [$unit->id => $match];
        });
    }

    /**
     * Fechas de operación en el rango (para gráficos semanales del SST).
     *
     * @return list<CarbonImmutable>
     */
    public static function operationDatesInRange(
        Unit $unit,
        ?string $from,
        ?string $to,
    ): array {
        $fromDay = $from !== null ? CarbonImmutable::parse($from)->startOfDay() : null;
        $toDay = $to !== null ? CarbonImmutable::parse($to)->endOfDay() : null;

        $dates = [];

        if ($unit->relationLoaded('movements')) {
            foreach ($unit->movements as $movement) {
                if ($movement->service_date === null) {
                    continue;
                }

                $day = CarbonImmutable::parse($movement->service_date)->startOfDay();

                if ($fromDay !== null && $day->lt($fromDay)) {
                    continue;
                }

                if ($toDay !== null && $day->gt($toDay)) {
                    continue;
                }

                $dates[] = $day;
            }
        }

        if ($dates === [] && $unit->service_date !== null) {
            $day = CarbonImmutable::parse($unit->service_date)->startOfDay();

            if (
                ($fromDay === null || $day->gte($fromDay))
                && ($toDay === null || $day->lte($toDay))
            ) {
                $dates[] = $day;
            }
        }

        return $dates;
    }

    public static function latestOperationDate(
        Unit $unit,
        ?string $from,
        ?string $to,
    ): ?CarbonImmutable {
        $dates = self::operationDatesInRange($unit, $from, $to);

        if ($dates === []) {
            return $unit->service_date !== null
                ? CarbonImmutable::parse($unit->service_date)->startOfDay()
                : null;
        }

        return collect($dates)->max();
    }

    public static function plateKey(Unit $unit): string
    {
        $plate = mb_strtoupper(trim((string) $unit->plate_number));

        return $plate !== '' ? $plate : 'unit-'.$unit->id;
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return Collection<int, Unit>
     */
    public static function uniqueByPlate(Collection $units): Collection
    {
        $seen = [];

        return $units
            ->sortByDesc(fn (Unit $unit) => self::latestOperationDate($unit, null, null)?->getTimestamp() ?? 0)
            ->filter(function (Unit $unit) use (&$seen) {
                $key = self::plateKey($unit);

                if (isset($seen[$key])) {
                    return false;
                }

                $seen[$key] = true;

                return true;
            })
            ->values();
    }

    /**
     * Flota operativa alineada con el listado de Unidades.
     *
     * @param  Collection<int, string>  $vehicleTypes
     * @return array{units: Collection<int, Unit>, checklists: Collection<int, UnitChecklist|null>}
     */
    public static function operationalFleet(
        ?string $from,
        ?string $to,
        string $templateType,
        ?int $coordinatorId,
        Collection $vehicleTypes,
        ?int $inspectorId,
    ): array {
        $query = Unit::query()
            ->with([
                'coordinatorUser:id,name',
                'period:id,name,date',
                'movements' => function (Builder $movement) use ($from, $to): void {
                    if ($from) {
                        $movement->whereDate('service_date', '>=', $from);
                    }

                    if ($to) {
                        $movement->whereDate('service_date', '<=', $to);
                    }
                },
            ])
            ->orderBy('id');

        self::applyActiveFilter($query);
        self::applyTemplateVehicleFilter($query, $templateType);
        self::applyServiceDateRange($query, $from, $to);

        if ($coordinatorId) {
            $query->where('coordinator_id', $coordinatorId);
        }

        if ($vehicleTypes->isNotEmpty()) {
            $query->whereIn('vehicle_type', $vehicleTypes->all());
        }

        $units = self::uniqueByPlate(
            $query->get([
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
                'service_date',
            ]),
        );

        $checklists = self::resolveChecklistsForUnits(
            $units,
            $templateType,
            $from,
            $to,
            $inspectorId,
        );

        return [
            'units' => $units,
            'checklists' => $checklists,
        ];
    }
}