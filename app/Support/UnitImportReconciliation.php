<?php

namespace App\Support;

use App\Models\Unit;
use App\Models\UnitImport;
use App\Models\UnitMovement;
use Illuminate\Support\Facades\Auth;

final class UnitImportReconciliation
{
    public function __construct(
        private readonly UnitExcelImporter $importer,
    ) {}

    /**
     * Cruza el archivo guardado y los movimientos del lote con el estado actual en BD.
     *
     * @param  'all'|'mismatch'|'ok'  $rowFilter
     * @return array{
     *     import: array<string, mixed>,
     *     file: array<string, mixed>,
     *     summary: array<string, int|bool>,
     *     rows: list<array<string, mixed>>
     * }
     */
    public function report(UnitImport $import, string $rowFilter = 'all'): array
    {
        $import->loadMissing(['period', 'user']);
        $period = $import->period;

        if ($period === null) {
            return $this->emptyReport($import, 'El periodo de la importación no existe.');
        }

        $presentUnitIds = $this->presentUnitIdsFromImport($import);
        $scopeCoordinatorId = $this->scopeCoordinatorId((string) $import->scope_key);

        $fileMeta = $this->importer->readPlatesFromStoredImport($import);

        $unitsQuery = Unit::query()
            ->where('period_id', $period->id)
            ->whereNotNull('plate_number')
            ->where('plate_number', '!=', '')
            ->with('coordinatorUser:id,name');

        if (SystemRoles::currentIsScopedCoordinator()) {
            $unitsQuery->where('coordinator_id', Auth::id());
        }

        $units = $unitsQuery
            ->orderBy('plate_number')
            ->orderBy('correlative')
            ->get(['id', 'correlative', 'plate_number', 'status', 'driver_name', 'provider', 'coordinator_id', 'service_date']);

        $movementPlates = UnitMovement::query()
            ->where('import_id', $import->id)
            ->whereNotNull('plate_number')
            ->pluck('plate_number')
            ->map(fn ($plate) => mb_strtoupper(trim((string) $plate)))
            ->unique()
            ->values()
            ->all();

        $rows = [];
        $checked = 0;
        $matches = 0;
        $mismatches = 0;
        $skipped = 0;

        foreach ($units as $unit) {
            $inExcel = in_array((int) $unit->id, $presentUnitIds, true);
            $inScope = $scopeCoordinatorId === null
                || (int) $unit->coordinator_id === $scopeCoordinatorId;

            $expected = null;
            if ($inScope) {
                $expected = $inExcel ? 'active' : 'inactive';
                $checked++;
            } else {
                $skipped++;
            }

            $actual = ($unit->status ?? 'active') === 'inactive' ? 'inactive' : 'active';
            $match = $expected === null ? null : $expected === $actual;

            if ($match === true) {
                $matches++;
            } elseif ($match === false) {
                $mismatches++;
            }

            if (! $this->rowPassesFilter($rowFilter, $match, $inScope)) {
                continue;
            }

            $rows[] = [
                'kind' => 'unit',
                'unit_id' => $unit->id,
                'correlative' => $unit->correlative,
                'plate_number' => $unit->plate_number,
                'driver_name' => $unit->driver_name,
                'provider' => $unit->provider,
                'coordinator' => $unit->coordinatorUser?->name,
                'in_excel' => $inExcel,
                'in_scope' => $inScope,
                'expected_status' => $expected,
                'actual_status' => $actual,
                'match' => $match,
                'service_date' => $unit->service_date?->format('Y-m-d'),
            ];
        }

        $unitPlatesInPeriod = $units
            ->pluck('plate_number')
            ->map(fn ($plate) => mb_strtoupper(trim((string) $plate)))
            ->unique()
            ->flip();

        foreach ($fileMeta['plates'] as $plate) {
            if (isset($unitPlatesInPeriod[$plate])) {
                continue;
            }

            $mismatches++;

            if ($rowFilter === 'ok') {
                continue;
            }

            $rows[] = [
                'kind' => 'missing_unit',
                'unit_id' => null,
                'correlative' => null,
                'plate_number' => $plate,
                'driver_name' => null,
                'provider' => null,
                'coordinator' => null,
                'in_excel' => true,
                'in_scope' => true,
                'expected_status' => 'active',
                'actual_status' => null,
                'match' => false,
                'service_date' => null,
                'note' => 'Placa en el Excel del lote sin unidad en este periodo.',
            ];
        }

        $filePlateSet = array_fill_keys($fileMeta['plates'], true);
        $movementPlateSet = array_fill_keys($movementPlates, true);
        $fileMovementMismatch = false;

        foreach (array_keys($filePlateSet) as $plate) {
            if (! isset($movementPlateSet[$plate])) {
                $fileMovementMismatch = true;
                break;
            }
        }

        foreach (array_keys($movementPlateSet) as $plate) {
            if (! isset($filePlateSet[$plate])) {
                $fileMovementMismatch = true;
                break;
            }
        }

        return [
            'import' => [
                'id' => $import->id,
                'imported_on' => $import->imported_on?->toDateString(),
                'created_at' => $import->created_at?->toIso8601String(),
                'original_name' => $import->original_name,
                'scope_key' => $import->scope_key,
                'scope_label' => $this->scopeLabel((string) $import->scope_key),
                'period' => [
                    'id' => $period->id,
                    'name' => $period->name,
                ],
                'user' => $import->user
                    ? ['id' => $import->user->id, 'name' => $import->user->name]
                    : null,
                'download_url' => is_string($import->file_path) && $import->file_path !== ''
                    ? url('/unidades/importaciones/'.$import->id.'/archivo')
                    : null,
                'movements_count' => count($presentUnitIds),
            ],
            'file' => [
                'rows_with_data' => $fileMeta['rows_with_data'],
                'unique_plates' => count($fileMeta['plates']),
                'plates' => $fileMeta['plates'],
                'read_errors' => $fileMeta['errors'],
                'file_missing' => $fileMeta['file_missing'],
                'movement_plates' => count($movementPlates),
                'file_movement_mismatch' => $fileMovementMismatch,
            ],
            'summary' => [
                'units_checked' => $checked,
                'matches' => $matches,
                'mismatches' => $mismatches,
                'skipped_scope' => $skipped,
                'all_ok' => $mismatches === 0
                    && $fileMeta['errors'] === []
                    && ! $fileMeta['file_missing']
                    && ! $fileMovementMismatch,
            ],
            'rows' => $rows,
        ];
    }

  /**
     * @return array{
     *     import: array<string, mixed>,
     *     file: array<string, mixed>,
     *     summary: array<string, int|bool>,
     *     rows: list<array<string, mixed>>
     * }
     */
    private function emptyReport(UnitImport $import, string $message): array
    {
        return [
            'import' => [
                'id' => $import->id,
                'imported_on' => $import->imported_on?->toDateString(),
                'original_name' => $import->original_name,
            ],
            'file' => [
                'rows_with_data' => 0,
                'unique_plates' => 0,
                'plates' => [],
                'read_errors' => [['row' => 0, 'messages' => [$message]]],
                'file_missing' => true,
                'movement_plates' => 0,
                'file_movement_mismatch' => false,
            ],
            'summary' => [
                'units_checked' => 0,
                'matches' => 0,
                'mismatches' => 0,
                'skipped_scope' => 0,
                'all_ok' => false,
            ],
            'rows' => [],
        ];
    }

    /**
     * @return list<int>
     */
    private function presentUnitIdsFromImport(UnitImport $import): array
    {
        return UnitMovement::query()
            ->where('import_id', $import->id)
            ->distinct()
            ->pluck('unit_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function scopeCoordinatorId(string $scopeKey): ?int
    {
        if ($scopeKey === 'all' || $scopeKey === '') {
            return null;
        }

        if (str_starts_with($scopeKey, 'user:')) {
            return (int) substr($scopeKey, 5);
        }

        return null;
    }

    private function scopeLabel(string $scopeKey): string
    {
        if ($scopeKey === 'all' || $scopeKey === '') {
            return 'Todas las unidades del periodo';
        }

        if (str_starts_with($scopeKey, 'user:')) {
            return 'Solo unidades del coordinador que importó';
        }

        return $scopeKey;
    }

  /**
     * @param  'all'|'mismatch'|'ok'  $filter
     */
    private function rowPassesFilter(string $filter, ?bool $match, bool $inScope): bool
    {
        if ($filter === 'all') {
            return true;
        }

        if (! $inScope) {
            return $filter === 'all';
        }

        if ($match === null) {
            return false;
        }

        return $filter === 'mismatch' ? ! $match : $match;
    }
}