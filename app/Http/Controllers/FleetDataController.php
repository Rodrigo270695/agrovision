<?php

namespace App\Http\Controllers;

use App\Models\GpsMovement;
use App\Models\GpsRecord;
use App\Models\Period;
use App\Models\RcInsurance;
use App\Models\RcInsuranceMovement;
use App\Support\GpsExcelImporter;
use App\Support\PermissionCatalog;
use App\Support\RcInsuranceExcelImporter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FleetDataController extends Controller
{
    public function index(Request $request): Response
    {
        PermissionCatalog::syncToDatabase();
        $filters = $this->validatedFilters($request);
        $tab = $filters['tab'];
        $showingHistory = $filters['view'] === 'history';

        if ($tab === 'gps') {
            return $this->gpsIndex($filters, $showingHistory);
        }

        return $this->rcIndex($filters, $showingHistory);
    }

    public function downloadRcTemplate(RcInsuranceExcelImporter $importer): StreamedResponse
    {
        return $importer->downloadTemplate();
    }

    public function downloadGpsTemplate(GpsExcelImporter $importer): StreamedResponse
    {
        return $importer->downloadTemplate();
    }

    public function exportRc(Request $request, RcInsuranceExcelImporter $importer): StreamedResponse
    {
        $filters = $this->validatedFilters($request);
        $history = $filters['view'] === 'history';

        if ($history) {
            $query = RcInsuranceMovement::query()
                ->with('period:id,name')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderByDesc('service_date')
                ->orderBy('plate_number');

            $this->applyDateRange($query, $filters, 'service_date');

            $rows = $query->get();
            $filename = 'historial-seguro-rc.xlsx';
        } else {
            $query = RcInsurance::query()
                ->with('period:id,name,status')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderBy('plate_number');

            if ($filters['search'] !== '') {
                $search = $filters['search'];
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('supervisor_tdp', 'ilike', "%{$search}%")
                        ->orWhere('vehicle_type', 'ilike', "%{$search}%");
                });
            }

            $rows = $query->get();
            $filename = 'seguro-rc.xlsx';
        }

        return $importer->export($rows, $filename, $history);
    }

    public function exportGps(Request $request, GpsExcelImporter $importer): StreamedResponse
    {
        $filters = $this->validatedFilters($request);
        $history = $filters['view'] === 'history';

        if ($history) {
            $query = GpsMovement::query()
                ->with('period:id,name')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderByDesc('service_date')
                ->orderBy('plate_number');

            $this->applyDateRange($query, $filters, 'service_date');

            $rows = $query->get();
            $filename = 'historial-gps.xlsx';
        } else {
            $query = GpsRecord::query()
                ->with('period:id,name,status')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderBy('plate_number');

            if ($filters['search'] !== '') {
                $search = $filters['search'];
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('imei', 'ilike', "%{$search}%");
                });
            }

            $rows = $query->get();
            $filename = 'gps.xlsx';
        }

        return $importer->export($rows, $filename, $history);
    }

    public function importRc(Request $request, RcInsuranceExcelImporter $importer): RedirectResponse
    {
        return $this->import($request, $importer, 'rc');
    }

    public function importGps(Request $request, GpsExcelImporter $importer): RedirectResponse
    {
        return $this->import($request, $importer, 'gps');
    }

    private function rcIndex(array $filters, bool $showingHistory): Response
    {
        $statsQuery = RcInsurance::query()
            ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id));

        $stats = [
            'records' => (clone $statsQuery)->count(),
            'active' => (clone $statsQuery)->where('status', 'active')->count(),
            'inactive' => (clone $statsQuery)->where('status', 'inactive')->count(),
            'movements' => RcInsuranceMovement::query()
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->count(),
            'on_screen' => 0,
        ];

        if ($showingHistory) {
            $query = RcInsuranceMovement::query()
                ->with('period:id,name,date')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderByDesc('service_date')
                ->orderBy('plate_number');

            $this->applyDateRange($query, $filters, 'service_date');

            if ($filters['search'] !== '') {
                $search = $filters['search'];
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('supervisor_tdp', 'ilike', "%{$search}%");
                });
            }

            $paginated = $query->paginate($filters['per_page'])->withQueryString();
            $stats['on_screen'] = $paginated->count();
        } else {
            $query = RcInsurance::query()
                ->with('period:id,name,status,date')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderBy('plate_number');

            if ($filters['search'] !== '') {
                $search = $filters['search'];
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('supervisor_tdp', 'ilike', "%{$search}%")
                        ->orWhere('vehicle_type', 'ilike', "%{$search}%");
                });
            }

            $paginated = $query->paginate($filters['per_page'])->withQueryString();
            $stats['on_screen'] = $paginated->count();
        }

        return Inertia::render('fleet-data/index', [
            'tab' => 'rc',
            'records' => $showingHistory ? null : $paginated,
            'movements' => $showingHistory ? $paginated : null,
            'stats' => $stats,
            'filters' => $filters,
            'periodOptions' => Period::query()->orderByDesc('date')->get(['id', 'name', 'status', 'date']),
        ]);
    }

    private function gpsIndex(array $filters, bool $showingHistory): Response
    {
        $statsQuery = GpsRecord::query()
            ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id));

        $stats = [
            'records' => (clone $statsQuery)->count(),
            'active' => (clone $statsQuery)->where('status', 'active')->count(),
            'inactive' => (clone $statsQuery)->where('status', 'inactive')->count(),
            'movements' => GpsMovement::query()
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->count(),
            'on_screen' => 0,
        ];

        if ($showingHistory) {
            $query = GpsMovement::query()
                ->with('period:id,name,date')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderByDesc('service_date')
                ->orderBy('plate_number');

            $this->applyDateRange($query, $filters, 'service_date');

            if ($filters['search'] !== '') {
                $search = $filters['search'];
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('imei', 'ilike', "%{$search}%");
                });
            }

            $paginated = $query->paginate($filters['per_page'])->withQueryString();
            $stats['on_screen'] = $paginated->count();
        } else {
            $query = GpsRecord::query()
                ->with('period:id,name,status,date')
                ->when($filters['period_id'], fn (Builder $q, int $id) => $q->where('period_id', $id))
                ->orderBy('plate_number');

            if ($filters['search'] !== '') {
                $search = $filters['search'];
                $query->where(function (Builder $builder) use ($search): void {
                    $builder
                        ->where('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('imei', 'ilike', "%{$search}%");
                });
            }

            $paginated = $query->paginate($filters['per_page'])->withQueryString();
            $stats['on_screen'] = $paginated->count();
        }

        return Inertia::render('fleet-data/index', [
            'tab' => 'gps',
            'records' => $showingHistory ? null : $paginated,
            'movements' => $showingHistory ? $paginated : null,
            'stats' => $stats,
            'filters' => $filters,
            'periodOptions' => Period::query()->orderByDesc('date')->get(['id', 'name', 'status', 'date']),
        ]);
    }

    /**
     * @param  RcInsuranceExcelImporter|GpsExcelImporter  $importer
     */
    private function import(Request $request, object $importer, string $tab): RedirectResponse
    {
        $validated = $request->validate([
            'period_id' => ['required', 'integer', 'exists:periods,id'],
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
        ]);

        $period = Period::query()->findOrFail($validated['period_id']);
        $result = $importer->import($request->file('file'), $period);

        if ($result['errors'] !== []) {
            return redirect()
                ->route('fleet-data.index', ['tab' => $tab])
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'La importación tiene errores. Revisa el detalle por fila.',
                ])
                ->with('fleet_import', [
                'tab' => $tab,
                'imported' => 0,
                'errors' => $result['errors'],
            ]);
        }

        return redirect()
            ->route('fleet-data.index', ['tab' => $tab])
            ->with('toast', [
            'type' => 'success',
            'message' => 'Los datos se cargaron correctamente.',
        ])->with('fleet_import', [
            'tab' => $tab,
            'imported' => $result['imported'],
            'created' => $result['created'],
            'updated' => $result['updated'],
            'records_created' => $result['records_created'],
            'deactivated' => $result['deactivated'],
            'errors' => [],
        ]);
    }

    /**
     * @return array{tab: string, view: string, search: string, period_id: int|null, date_from: string|null, date_to: string|null, all_dates: bool, per_page: int}
     */
    private function validatedFilters(Request $request): array
    {
        $validated = $request->validate([
            'tab' => ['nullable', Rule::in(['rc', 'gps'])],
            'view' => ['nullable', Rule::in(['records', 'history'])],
            'search' => ['nullable', 'string', 'max:255'],
            'period_id' => ['nullable', 'integer', 'exists:periods,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'all_dates' => ['nullable', 'boolean'],
            'per_page' => ['nullable', Rule::in([10, 25, 50, 100])],
        ]);

        $allDates = $request->boolean('all_dates');
        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;

        if ($allDates) {
            $dateFrom = null;
            $dateTo = null;
        } elseif ($dateFrom === null && $dateTo === null && ($validated['view'] ?? 'records') === 'history') {
            $today = now()->toDateString();
            $dateFrom = $today;
            $dateTo = $today;
        } elseif ($dateFrom && $dateTo && $dateFrom > $dateTo) {
            [$dateFrom, $dateTo] = [$dateTo, $dateFrom];
        }

        return [
            'tab' => $validated['tab'] ?? 'rc',
            'view' => $validated['view'] ?? 'records',
            'search' => trim((string) ($validated['search'] ?? '')),
            'period_id' => isset($validated['period_id']) ? (int) $validated['period_id'] : null,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'all_dates' => $allDates,
            'per_page' => (int) ($validated['per_page'] ?? 25),
        ];
    }

    /**
     * @param  array{date_from: string|null, date_to: string|null, all_dates: bool}  $filters
     */
    private function applyDateRange(Builder $query, array $filters, string $column): void
    {
        if ($filters['all_dates']) {
            return;
        }

        if ($filters['date_from'] && $filters['date_to']) {
            $query->whereBetween($column, [$filters['date_from'], $filters['date_to']]);
        }
    }
}
