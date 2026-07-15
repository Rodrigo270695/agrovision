<?php

namespace App\Http\Controllers;

use App\Http\Requests\UnitRequest;
use App\Models\Period;
use App\Models\Unit;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
use App\Support\SystemRoles;
use App\Support\UnitDocumentTypes;
use App\Support\UnitExcelImporter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $units = $this->filteredUnitsQuery($filters, clone $baseQuery)
            ->with([
                'period:id,name,status,date',
                'coordinatorUser:id,name,email',
                'documents' => fn ($query) => $query
                    ->latest()
                    ->with('uploader:id,name'),
            ])
            ->withCount('documents')
            ->paginate($filters['per_page'])
            ->withQueryString()
            ->through(function (Unit $unit) {
                $unit->setAttribute(
                    'documents_progress',
                    UnitDocumentTypes::progress($unit->documents),
                );

                return $unit;
            });

        return Inertia::render('units/index', [
            'units' => $units,
            'filters' => [
                'search' => $filters['search'],
                'period_id' => $filters['period_id'],
                'sort' => $filters['sort'],
                'direction' => $filters['direction'],
                'per_page' => $filters['per_page'],
            ],
            'periodOptions' => Period::query()
                ->orderByDesc('date')
                ->get(['id', 'name', 'status', 'date']),
            'coordinatorOptions' => $this->coordinatorOptions(),
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
                'providers' => (clone $baseQuery)->distinct()->count('provider'),
                'page' => $units->currentPage().'/'.max($units->lastPage(), 1),
                'on_screen' => $units->count(),
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

        Unit::create($data);

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

        $unit->update($data);

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

    public function downloadTemplate(UnitExcelImporter $importer): StreamedResponse
    {
        return $importer->downloadTemplate();
    }

    public function export(Request $request, UnitExcelImporter $importer): StreamedResponse
    {
        $filters = $this->validatedFilters($request);

        $units = $this->filteredUnitsQuery($filters, $this->scopedUnitsQuery())
            ->with(['period:id,name,date', 'coordinatorUser:id,name'])
            ->get();

        $suffix = now()->format('Y-m-d_His');

        return $importer->export($units, "unidades-{$suffix}.xlsx");
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
            'message' => "Se importaron {$result['imported']} unidades correctamente.",
        ])->with('unit_import', [
            'imported' => $result['imported'],
            'errors' => [],
        ]);
    }

    /**
     * @return array{search: string, period_id: int|null, sort: string, direction: string, per_page: int}
     */
    private function validatedFilters(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'period_id' => ['nullable', 'integer', 'exists:periods,id'],
            'sort' => ['nullable', Rule::in([
                'correlative',
                'provider',
                'plate_number',
                'driver_name',
                'vehicle_type',
                'service_date',
                'created_at',
            ])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        return [
            'search' => trim((string) ($validated['search'] ?? '')),
            'period_id' => $validated['period_id'] ?? null,
            'sort' => $validated['sort'] ?? 'correlative',
            'direction' => $validated['direction'] ?? 'desc',
            'per_page' => (int) ($validated['per_page'] ?? 10),
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
     * @param  array{search: string, period_id: int|null, sort: string, direction: string, per_page: int}  $filters
     * @param  Builder<Unit>|null  $base
     * @return Builder<Unit>
     */
    private function filteredUnitsQuery(array $filters, ?Builder $base = null): Builder
    {
        $query = $base ?? $this->scopedUnitsQuery();

        if ($filters['period_id']) {
            $query->where('period_id', $filters['period_id']);
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
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhereHas('coordinatorUser', function ($q) use ($search) {
                        $q->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        return $query->orderBy($filters['sort'], $filters['direction']);
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
