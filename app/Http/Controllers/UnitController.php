<?php

namespace App\Http\Controllers;

use App\Http\Requests\UnitRequest;
use App\Models\ChecklistTemplate;
use App\Models\LicenseCategory;
use App\Models\Period;
use App\Models\ResponsiblePerson;
use App\Models\ServiceType;
use App\Models\Unit;
use App\Models\UnitImport;
use App\Models\UnitMovement;
use App\Models\UnitStatusEvent;
use App\Models\VehicleType;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
use App\Support\SystemRoles;
use App\Support\UnitCatalog;
use App\Support\UnitDocumentTypes;
use App\Support\UnitExcelImporter;
use App\Support\UnitImportReconciliation;
use App\Support\UnitOperationalScope;
use App\Support\UnitStatusHistory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UnitController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->validatedFilters($request);

        PermissionCatalog::syncToDatabase();

        $baseQuery = $this->scopedUnitsQuery();
        $showingMovements = $filters['view'] === 'movements';
        $showingFiles = $filters['view'] === 'files';
        $showingReconcile = $filters['view'] === 'reconcile';
        UnitStatusHistory::ensure();

        $units = $showingMovements || $showingFiles || $showingReconcile
            ? null
            : ($this->filteredUnitsQuery($filters, clone $baseQuery)
                ->with([
                    'period:id,name,status,date',
                    'coordinatorUser:id,name,email',
                    'documents' => fn ($query) => $query
                        ->latest()
                        ->with('uploader:id,name'),
                ])
                ->withCount('documents')
                ->addSelect([
                    'has_inspection' => UnitOperationalScope::inspectionExistsSubquery(
                        $filters['date_from'],
                        $filters['date_to'],
                        $filters['template_type'],
                    ),
                    'last_inactive_on' => UnitStatusEvent::query()
                        ->select('happened_on')
                        ->whereColumn('unit_status_events.unit_id', 'units.id')
                        ->where('status', 'inactive')
                        ->orderByDesc('happened_on')
                        ->limit(1),
                    'last_active_on' => UnitStatusEvent::query()
                        ->select('happened_on')
                        ->whereColumn('unit_status_events.unit_id', 'units.id')
                        ->where('status', 'active')
                        ->orderByDesc('happened_on')
                        ->limit(1),
                ])
                ->paginate($filters['per_page'])
                ->withQueryString()
                ->through(function (Unit $unit) {
                    $unit->setAttribute(
                        'documents_progress',
                        UnitDocumentTypes::progress($unit->documents),
                    );
                    $unit->setAttribute(
                        'has_inspection',
                        in_array($unit->has_inspection, [true, 1, '1', 't', 'true'], true),
                    );

                    return $unit;
                }));

        $movements = $showingMovements
            ? $this->filteredMovementsQuery($filters)
                ->with([
                    'period:id,name,date',
                    'coordinator:id,name',
                ])
                ->paginate($filters['per_page'])
                ->withQueryString()
            : null;

        $activePage = $movements ?? $units;
        $imports = $showingFiles || $showingReconcile ? $this->importFiles($filters) : [];
        $reconcile = $showingReconcile
            ? $this->reconcileImport($request, $filters)
            : null;

        return Inertia::render('units/index', [
            'units' => $units ?? [
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $filters['per_page'],
                'total' => 0,
                'from' => null,
                'to' => null,
            ],
            'movements' => $movements,
            'imports' => $imports,
            'reconcile' => $reconcile,
            'filters' => [
                'search' => $filters['search'],
                'period_id' => $filters['period_id'],
                'date_from' => $filters['date_from'],
                'date_to' => $filters['date_to'],
                'all_dates' => $filters['all_dates'],
                'view' => $filters['view'],
                'status' => $filters['status'],
                'coordinator_id' => $filters['coordinator_id'],
                'inspection' => $filters['inspection'],
                'template_type' => $filters['template_type'],
                'sort' => $filters['sort'],
                'direction' => $filters['direction'],
                'per_page' => $filters['per_page'],
                'import_id' => $filters['import_id'],
                'reconcile_filter' => $filters['reconcile_filter'],
            ],
            'checklistTemplateOptions' => collect(ChecklistTemplate::options())
                ->map(fn (array $row) => [
                    'value' => $row['value'],
                    'label' => $row['label'],
                ])
                ->values()
                ->all(),
            'periodOptions' => Period::query()
                ->orderByDesc('date')
                ->get(['id', 'name', 'status', 'date']),
            'coordinatorOptions' => $this->coordinatorOptions(),
            'vehicleTypeOptions' => VehicleType::query()
                ->orderBy('sort')
                ->orderBy('name')
                ->pluck('name')
                ->values(),
            'licenseCategoryOptions' => LicenseCategory::query()
                ->orderBy('sort')
                ->orderBy('name')
                ->get(['name', 'description']),
            'serviceTypeOptions' => ServiceType::query()
                ->orderBy('sort')
                ->orderBy('name')
                ->pluck('name')
                ->values(),
            'responsibleOptions' => ResponsiblePerson::query()
                ->orderBy('sort')
                ->orderBy('name')
                ->pluck('name')
                ->values(),
            'documentTypes' => collect(UnitDocumentTypes::labels())
                ->map(fn (string $label, string $key) => [
                    'value' => $key,
                    'label' => $label,
                    'required' => in_array($key, UnitDocumentTypes::requiredKeys(), true),
                ])
                ->values()
                ->all(),
            'requiredDocumentTypes' => collect(UnitDocumentTypes::requiredKeys())
                ->map(fn (string $key) => [
                    'value' => $key,
                    'label' => UnitDocumentTypes::label($key),
                ])
                ->values()
                ->all(),
            'stats' => [
                'units' => (clone $baseQuery)->count(),
                'movements' => $this->filteredMovementsQuery($filters)->count(),
                'providers' => (clone $baseQuery)->distinct()->count('provider'),
                'page' => $activePage
                    ? $activePage->currentPage().'/'.max($activePage->lastPage(), 1)
                    : '1/1',
                'on_screen' => $activePage ? $activePage->count() : count($imports),
                'without_plate' => (clone $baseQuery)
                    ->where(function ($query) {
                        $query->whereNull('plate_number')
                            ->orWhere('plate_number', '');
                    })
                    ->count(),
            ],
        ]);
    }

    public function store(UnitRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $data['coordinator_id'] = Auth::id();
        }

        $data = $this->rememberCatalogValues($data);
        $data['status'] = ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        $unit = Unit::create($data);
        UnitStatusHistory::record(
            $unit->id,
            $unit->status,
            $unit->service_date ?? now(),
            'manual',
        );

        return IndexedRedirect::toIndex($request, 'units.index', [
            'type' => 'success',
            'message' => 'Unidad creada correctamente.',
        ]);
    }

    public function update(UnitRequest $request, Unit $unit): RedirectResponse
    {
        $this->ensureCanAccessUnit($unit);

        $data = $request->validated();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $data['coordinator_id'] = Auth::id();
        }

        $data = $this->rememberCatalogValues($data);
        $previousStatus = $unit->status ?: 'active';
        $data['status'] = ($data['status'] ?? $previousStatus) === 'inactive' ? 'inactive' : 'active';

        $unit->update($data);

        if ($unit->status !== $previousStatus) {
            UnitStatusHistory::record(
                $unit->id,
                $unit->status,
                now(),
                'manual',
            );
        }

        return IndexedRedirect::toIndex($request, 'units.index', [
            'type' => 'success',
            'message' => 'Unidad actualizada correctamente.',
        ]);
    }

    public function destroy(Request $request, Unit $unit): RedirectResponse
    {
        $this->ensureCanAccessUnit($unit);

        $unit->delete();

        return IndexedRedirect::toIndex($request, 'units.index', [
            'type' => 'success',
            'message' => 'Unidad eliminada correctamente.',
        ]);
    }

    public function storeVehicleType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ], [
            'name.required' => 'Escribe el tipo de vehículo.',
        ]);

        $type = UnitCatalog::rememberVehicleType($validated['name']);

        if ($type === null) {
            return response()->json([
                'message' => 'Escribe el tipo de vehículo.',
            ], 422);
        }

        return response()->json([
            'name' => $type->name,
        ]);
    }

    public function storeLicenseCategory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ], [
            'name.required' => 'Escribe la categoría.',
        ]);

        $category = UnitCatalog::rememberLicenseCategory($validated['name']);

        if ($category === null) {
            return response()->json([
                'message' => 'Escribe la categoría.',
            ], 422);
        }

        return response()->json([
            'name' => $category->name,
            'description' => $category->description,
        ]);
    }

    public function storeServiceType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ], [
            'name.required' => 'Escribe el tipo de servicio.',
        ]);

        $type = UnitCatalog::rememberServiceType($validated['name']);

        if ($type === null) {
            return response()->json([
                'message' => 'Escribe el tipo de servicio.',
            ], 422);
        }

        return response()->json([
            'name' => $type->name,
        ]);
    }

    public function storeResponsiblePerson(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ], [
            'name.required' => 'Escribe el responsable.',
        ]);

        $person = UnitCatalog::rememberResponsiblePerson($validated['name']);

        if ($person === null) {
            return response()->json([
                'message' => 'Escribe el responsable.',
            ], 422);
        }

        return response()->json([
            'name' => $person->name,
        ]);
    }

    public function downloadTemplate(UnitExcelImporter $importer): StreamedResponse
    {
        return $importer->downloadTemplate();
    }

    public function export(Request $request, UnitExcelImporter $importer): StreamedResponse
    {
        $filters = $this->validatedFilters($request);

        $units = $this->filteredUnitsQuery($filters, $this->scopedUnitsQuery())
            ->with(['period:id,name,date', 'coordinatorUser:id,name'])
            ->addSelect([
                'has_inspection' => UnitOperationalScope::inspectionExistsSubquery(
                    $filters['date_from'],
                    $filters['date_to'],
                    $filters['template_type'],
                ),
            ])
            ->get();

        $periodName = 'Todos los periodos';

        if ($filters['period_id']) {
            $periodName = (string) (Period::query()->whereKey($filters['period_id'])->value('name') ?? $periodName);
        }

        if ($filters['all_dates'] || ($filters['date_from'] === null && $filters['date_to'] === null)) {
            $dateLabel = 'Todas las fechas';
        } elseif ($filters['date_from'] === $filters['date_to']) {
            $dateLabel = Carbon::parse((string) $filters['date_from'])->format('d/m/Y');
        } else {
            $from = $filters['date_from']
                ? Carbon::parse($filters['date_from'])->format('d/m/Y')
                : '…';
            $to = $filters['date_to']
                ? Carbon::parse($filters['date_to'])->format('d/m/Y')
                : '…';
            $dateLabel = "{$from} al {$to}";
        }

        $suffix = now()->format('Y-m-d_His');

        return $importer->export($units, "unidades-{$suffix}.xlsx", [
            'period' => $periodName,
            'dates' => $dateLabel,
            'search' => $filters['search'] !== '' ? $filters['search'] : 'Sin búsqueda',
            'generated_at' => now()->format('d/m/Y H:i'),
            'total' => $units->count(),
        ]);
    }

    public function import(Request $request, UnitExcelImporter $importer): RedirectResponse
    {
        $validated = $request->validate([
            'period_id' => ['required', 'integer', 'exists:periods,id'],
            'file' => [
                'required',
                'file',
                'mimes:xlsx,xls',
                'max:10240',
            ],
        ], [
            'period_id.required' => 'Debes seleccionar un periodo.',
            'period_id.exists' => 'El periodo seleccionado no existe.',
            'file.required' => 'Debes subir un archivo Excel.',
            'file.mimes' => 'El archivo debe ser .xlsx o .xls.',
            'file.max' => 'El archivo no puede superar los 10 MB.',
        ]);

        $period = Period::query()->findOrFail($validated['period_id']);
        $result = $importer->import($request->file('file'), $period);

        if ($result['errors'] !== []) {
            return IndexedRedirect::toIndex($request, 'units.index', [
                'type' => 'error',
                'message' => 'La importación tiene errores. Revisa el detalle por fila.',
            ])->with('unit_import', [
                'imported' => 0,
                'errors' => $result['errors'],
            ]);
        }

        return IndexedRedirect::toIndex($request, 'units.index', [
            'type' => 'success',
            'message' => ($result['replaced'] ?? false)
                ? 'Se reemplazó la carga de hoy y quedó el archivo nuevo.'
                : 'Los datos se cargaron correctamente.',
        ])->with('unit_import', [
            'imported' => $result['imported'],
            'created' => $result['created'],
            'updated' => $result['updated'],
            'units_created' => $result['units_created'],
            'deactivated' => $result['deactivated'],
            'replaced' => $result['replaced'] ?? false,
            'errors' => [],
        ]);
    }

    public function downloadImport(UnitImport $unitImport): StreamedResponse
    {
        $disk = $unitImport->file_disk ?: 'local';
        $path = $unitImport->file_path;

        abort_unless(
            is_string($path) && $path !== '' && Storage::disk($disk)->exists($path),
            404,
            'Ese Excel ya no está guardado.',
        );

        return Storage::disk($disk)->download(
            $path,
            $unitImport->original_name ?: 'unidades.xlsx',
        );
    }

    /**
     * @param  array{search: string, period_id: int|null}  $filters
     * @return list<array<string, mixed>>
     */
    private function importFiles(array $filters): array
    {
        if (! Schema::hasTable('unit_imports')) {
            return [];
        }

        $query = UnitImport::query()
            ->with(['period:id,name', 'user:id,name']);

        if (Schema::hasTable('unit_movements') && Schema::hasColumn('unit_movements', 'import_id')) {
            $query->withCount('movements');
        }

        try {
            return $query
                ->when($filters['period_id'], fn (Builder $query, int $periodId) => $query->where('period_id', $periodId))
                ->when($filters['search'] !== '', function (Builder $query) use ($filters): void {
                    $term = '%'.$filters['search'].'%';
                    $query->where(function (Builder $inner) use ($term): void {
                        if (Schema::hasColumn('unit_imports', 'original_name')) {
                            $inner->where('original_name', 'ilike', $term);
                        }

                        $inner->orWhereHas('user', fn (Builder $user) => $user->where('name', 'ilike', $term))
                            ->orWhereHas('period', fn (Builder $period) => $period->where('name', 'ilike', $term));
                    });
                })
                ->orderByDesc('imported_on')
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->map(fn (UnitImport $import): array => [
                    'id' => $import->id,
                    'imported_on' => $import->imported_on?->toDateString(),
                    'created_at' => $import->created_at?->toIso8601String(),
                    'original_name' => $import->original_name,
                    'rows' => (int) ($import->movements_count ?? 0),
                    'period' => $import->period
                        ? ['id' => $import->period->id, 'name' => $import->period->name]
                        : null,
                    'user' => $import->user
                        ? ['id' => $import->user->id, 'name' => $import->user->name]
                        : null,
                    'download_url' => is_string($import->file_path) && $import->file_path !== ''
                        ? url('/unidades/importaciones/'.$import->id.'/archivo')
                        : null,
                ])
                ->all();
        } catch (\Throwable $exception) {
            report($exception);

            return [];
        }
    }

    /**
     * @return array{search: string, period_id: int|null, date_from: string|null, date_to: string|null, all_dates: bool, view: string, status: string|null, coordinator_id: int|null, inspection: string|null, template_type: string|null, sort: string, direction: string, per_page: int}
     */
    private function validatedFilters(Request $request): array
    {
        $templateTypes = array_column(ChecklistTemplate::options(), 'value');

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'period_id' => ['nullable', 'integer', 'exists:periods,id'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'coordinator_id' => ['nullable', 'integer', 'exists:users,id'],
            'inspection' => ['nullable', Rule::in(['yes', 'no'])],
            'template_type' => $templateTypes === []
                ? ['nullable', 'string', 'max:50']
                : ['nullable', Rule::in($templateTypes)],
            'view' => ['nullable', Rule::in(['units', 'movements', 'files', 'reconcile'])],
            'import_id' => ['nullable', 'integer'],
            'reconcile_filter' => ['nullable', Rule::in(['all', 'mismatch', 'ok'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'all_dates' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in([
                'correlative',
                'provider',
                'plate_number',
                'driver_name',
                'vehicle_type',
                'route',
                'sede',
                'garita',
                'service_date',
                'created_at',
            ])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $allDates = $request->boolean('all_dates');
        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;

        if ($allDates) {
            $dateFrom = null;
            $dateTo = null;
        } elseif ($dateFrom === null && $dateTo === null) {
            $today = now();
            $dateFrom = $today->startOfMonth()->toDateString();
            $dateTo = $today->endOfMonth()->toDateString();
        } elseif ($dateFrom && $dateTo && $dateFrom > $dateTo) {
            [$dateFrom, $dateTo] = [$dateTo, $dateFrom];
        }

        return [
            'search' => trim((string) ($validated['search'] ?? '')),
            'period_id' => $validated['period_id'] ?? null,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'all_dates' => $allDates,
            'view' => $validated['view'] ?? 'units',
            'status' => $validated['status'] ?? null,
            'coordinator_id' => isset($validated['coordinator_id']) ? (int) $validated['coordinator_id'] : null,
            'inspection' => $validated['inspection'] ?? null,
            'template_type' => $validated['template_type'] ?? null,
            'sort' => $validated['sort'] ?? 'correlative',
            'direction' => $validated['direction'] ?? 'desc',
            'per_page' => (int) ($validated['per_page'] ?? 10),
            'import_id' => isset($validated['import_id']) ? (int) $validated['import_id'] : null,
            'reconcile_filter' => $validated['reconcile_filter'] ?? 'mismatch',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>|null
     */
    private function reconcileImport(Request $request, array $filters): ?array
    {
        if (! Schema::hasTable('unit_imports')) {
            return null;
        }

        $importId = $filters['import_id'] ?? null;
        $query = UnitImport::query()
            ->with(['period:id,name', 'user:id,name'])
            ->orderByDesc('imported_on')
            ->orderByDesc('id');

        if ($filters['period_id']) {
            $query->where('period_id', (int) $filters['period_id']);
        }

        if ($importId) {
            $query->whereKey((int) $importId);
        }

        $import = $query->first();

        if ($import === null) {
            return [
                'missing_import' => true,
                'message' => $filters['period_id']
                    ? 'No hay importaciones guardadas para este periodo. Sube un Excel en Archivos.'
                    : 'Selecciona un periodo o sube un Excel para poder cruzar.',
            ];
        }

        $report = app(UnitImportReconciliation::class)->report(
            $import,
            (string) ($filters['reconcile_filter'] ?? 'mismatch'),
        );

        return [
            'missing_import' => false,
            'report' => $report,
            'import_options' => $this->importFiles($filters),
        ];
    }

    /**
     * @return Builder<Unit>
     */
    private function scopedUnitsQuery(): Builder
    {
        $query = Unit::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        return $query;
    }

    /**
     * @param  array{search: string, period_id: int|null, date_from: string|null, date_to: string|null, all_dates: bool, sort: string, direction: string, per_page: int}  $filters
     * @param  Builder<Unit>|null  $base
     * @return Builder<Unit>
     */
    private function filteredUnitsQuery(array $filters, ?Builder $base = null): Builder
    {
        $query = $base ?? $this->scopedUnitsQuery();

        if ($filters['period_id']) {
            $query->where('period_id', $filters['period_id']);
        }

        if (($filters['status'] ?? null) === 'inactive') {
            $query->where('status', 'inactive');
        } elseif (($filters['status'] ?? null) === 'active') {
            $query->where(function ($builder) {
                $builder->where('status', 'active')->orWhereNull('status');
            });
        }

        if (! empty($filters['coordinator_id'])) {
            $query->where('coordinator_id', (int) $filters['coordinator_id']);
        }

        UnitOperationalScope::applyTemplateVehicleFilter(
            $query,
            $filters['template_type'] ?? null,
        );

        $dateFrom = $filters['date_from'];
        $dateTo = $filters['date_to'];

        UnitOperationalScope::applyServiceDateRange($query, $dateFrom, $dateTo);

        $inspection = $filters['inspection'] ?? null;
        if ($inspection === 'yes' || $inspection === 'no') {
            $exists = fn (QueryBuilder $outer) => UnitOperationalScope::applyInspectionExists(
                $outer,
                $dateFrom,
                $dateTo,
                $filters['template_type'] ?? null,
            );

            if ($inspection === 'yes') {
                $query->whereExists($exists);
            } else {
                $query->whereNotExists($exists);
            }
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('correlative', 'ilike', "%{$search}%")
                    ->orWhere('provider', 'ilike', "%{$search}%")
                    ->orWhere('plate_number', 'ilike', "%{$search}%")
                    ->orWhere('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('route', 'ilike', "%{$search}%")
                    ->orWhere('sede', 'ilike', "%{$search}%")
                    ->orWhere('garita', 'ilike', "%{$search}%")
                    ->orWhereHas('coordinatorUser', function ($q) use ($search) {
                        $q->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        return $query->orderBy($filters['sort'], $filters['direction']);
    }

    /**
     * @param  array{search: string, period_id: int|null, date_from: string|null, date_to: string|null, all_dates: bool, view: string, sort: string, direction: string, per_page: int}  $filters
     * @return Builder<UnitMovement>
     */
    private function filteredMovementsQuery(array $filters): Builder
    {
        $query = UnitMovement::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where(function (Builder $builder) {
                $builder
                    ->where('coordinator_id', Auth::id())
                    ->orWhereHas('unit', fn (Builder $unit) => $unit->where('coordinator_id', Auth::id()));
            });
        }

        if ($filters['period_id']) {
            $query->where('period_id', $filters['period_id']);
        }

        if ($filters['date_from']) {
            $query->whereDate('service_date', '>=', $filters['date_from']);
        }

        if ($filters['date_to']) {
            $query->whereDate('service_date', '<=', $filters['date_to']);
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function (Builder $builder) use ($search) {
                $builder
                    ->where('correlative', 'ilike', "%{$search}%")
                    ->orWhere('provider', 'ilike', "%{$search}%")
                    ->orWhere('plate_number', 'ilike', "%{$search}%")
                    ->orWhere('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('route', 'ilike', "%{$search}%")
                    ->orWhere('sede', 'ilike', "%{$search}%")
                    ->orWhere('garita', 'ilike', "%{$search}%")
                    ->orWhere('service_type', 'ilike', "%{$search}%");
            });
        }

        $sort = in_array($filters['sort'], [
            'correlative',
            'provider',
            'plate_number',
            'driver_name',
            'vehicle_type',
            'service_date',
            'created_at',
        ], true) ? $filters['sort'] : 'service_date';

        return $query->orderBy($sort, $filters['direction'])->orderByDesc('id');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function rememberCatalogValues(array $data): array
    {
        if (array_key_exists('vehicle_type', $data)) {
            $type = UnitCatalog::rememberVehicleType(
                is_string($data['vehicle_type']) ? $data['vehicle_type'] : null,
            );
            $data['vehicle_type'] = $type?->name;
        }

        if (array_key_exists('category', $data)) {
            $category = UnitCatalog::rememberLicenseCategory(
                is_string($data['category']) ? $data['category'] : null,
            );
            $data['category'] = $category?->name;
        }

        if (array_key_exists('service_type', $data)) {
            $serviceType = UnitCatalog::rememberServiceType(
                is_string($data['service_type']) ? $data['service_type'] : null,
            );
            $data['service_type'] = $serviceType?->name;
        }

        if (array_key_exists('responsible_person', $data)) {
            $responsible = UnitCatalog::rememberResponsiblePerson(
                is_string($data['responsible_person']) ? $data['responsible_person'] : null,
            );
            $data['responsible_person'] = $responsible?->name;
        }

        return $data;
    }

    private function ensureCanAccessUnit(Unit $unit): void
    {
        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $unit->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a esta unidad.');
        }
    }

    /**
     * @return list<array{id: int, name: string, email: string|null}>
     */
    private function coordinatorOptions(): array
    {
        $query = SystemRoles::coordinators();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query = $query->where('id', Auth::id())->values();
        }

        return $query
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])
            ->values()
            ->all();
    }
}
