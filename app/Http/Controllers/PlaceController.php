<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlaceRequest;
use App\Models\Place;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlaceController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['name', 'status', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        PermissionCatalog::syncToDatabase();

        $placesQuery = Place::query()->withCount(['users', 'alcoholTests']);

        if ($search !== '') {
            $placesQuery->where(function ($query) use ($search) {
                $query
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $placesQuery->orderBy($sort, $direction);

        $places = $placesQuery
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('places/index', [
            'places' => $places,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'stats' => [
                'places' => Place::query()->count(),
                'active' => Place::query()->where('status', 'active')->count(),
                'inactive' => Place::query()->where('status', 'inactive')->count(),
                'on_screen' => $places->count(),
            ],
        ]);
    }

    public function store(PlaceRequest $request): RedirectResponse
    {
        Place::query()->create($request->validated());

        return IndexedRedirect::toIndex($request, 'places.index', [
            'type' => 'success',
            'message' => 'Lugar creado correctamente.',
        ]);
    }

    public function update(PlaceRequest $request, Place $place): RedirectResponse
    {
        $place->update($request->validated());

        return IndexedRedirect::toIndex($request, 'places.index', [
            'type' => 'success',
            'message' => 'Lugar actualizado correctamente.',
        ]);
    }

    public function destroy(Request $request, Place $place): RedirectResponse
    {
        if ($place->users()->exists() || $place->alcoholTests()->exists()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar un lugar con usuarios o tests asociados.',
            ]);
        }

        $place->delete();

        return IndexedRedirect::toIndex($request, 'places.index', [
            'type' => 'success',
            'message' => 'Lugar eliminado correctamente.',
        ]);
    }
}
