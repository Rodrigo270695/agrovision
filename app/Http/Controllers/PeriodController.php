<?php

namespace App\Http\Controllers;

use App\Http\Requests\PeriodRequest;
use App\Models\Period;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PeriodController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['name', 'date', 'status', 'units_count', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sort = $validated['sort'] ?? 'date';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        PermissionCatalog::syncToDatabase();

        $periodsQuery = Period::query()->withCount('units');

        if ($search !== '') {
            $periodsQuery->where(function ($query) use ($search) {
                $query
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('status', 'ilike', "%{$search}%");
            });
        }

        $periodsQuery->orderBy($sort, $direction);

        $periods = $periodsQuery
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('periods/index', [
            'periods' => $periods,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'stats' => [
                'periods' => Period::query()->count(),
                'active' => Period::query()->where('status', 'active')->count(),
                'page' => $periods->currentPage().'/'.max($periods->lastPage(), 1),
                'on_screen' => $periods->count(),
                'inactive' => Period::query()->where('status', 'inactive')->count(),
            ],
        ]);
    }

    public function store(PeriodRequest $request): RedirectResponse
    {
        Period::create($request->validated());

        return IndexedRedirect::toIndex($request, 'periods.index', [
            'type' => 'success',
            'message' => 'Periodo creado correctamente.',
        ]);
    }

    public function update(PeriodRequest $request, Period $period): RedirectResponse
    {
        $period->update($request->validated());

        return IndexedRedirect::toIndex($request, 'periods.index', [
            'type' => 'success',
            'message' => 'Periodo actualizado correctamente.',
        ]);
    }

    public function destroy(Request $request, Period $period): RedirectResponse
    {
        if ($period->units()->exists()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar un periodo con unidades asociadas.',
            ]);
        }

        $period->delete();

        return IndexedRedirect::toIndex($request, 'periods.index', [
            'type' => 'success',
            'message' => 'Periodo eliminado correctamente.',
        ]);
    }
}
