<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlaceRequest;
use App\Http\Requests\SiteRequest;
use App\Models\Place;
use App\Models\Site;
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
            'site' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['name', 'status', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
            'sites_search' => ['nullable', 'string', 'max:255'],
            'sites_sort' => ['nullable', Rule::in(['name', 'status', 'created_at'])],
            'sites_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'sites_per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';
        $perPage = (int) ($validated['per_page'] ?? 10);
        $sitesSearch = trim((string) ($validated['sites_search'] ?? ''));
        $sitesSort = $validated['sites_sort'] ?? 'name';
        $sitesDirection = $validated['sites_direction'] ?? 'asc';
        $sitesPerPage = (int) ($validated['sites_per_page'] ?? 10);

        PermissionCatalog::syncToDatabase();

        $selectedSite = Site::query()->find($request->integer('site') ?: null);

        $sitesQuery = Site::query()->withCount('places');

        if ($sitesSearch !== '') {
            $sitesQuery->where(function ($query) use ($sitesSearch) {
                $query
                    ->where('name', 'ilike', "%{$sitesSearch}%")
                    ->orWhere('description', 'ilike', "%{$sitesSearch}%");
            });
        }

        $sites = $sitesQuery
            ->orderBy($sitesSort, $sitesDirection)
            ->paginate($sitesPerPage, ['*'], 'sites_page')
            ->withQueryString();

        $placesQuery = Place::query()->withCount(['users', 'alcoholTests']);

        if ($selectedSite) {
            $placesQuery->where('site_id', $selectedSite->id);
        } else {
            $placesQuery->whereRaw('1 = 0');
        }

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

        $placesInSite = $selectedSite
            ? Place::query()->where('site_id', $selectedSite->id)
            : null;

        return Inertia::render('places/index', [
            'sites' => $sites,
            'selectedSite' => $selectedSite ? [
                'id' => $selectedSite->id,
                'name' => $selectedSite->name,
            ] : null,
            'places' => $places,
            'siteFilters' => [
                'search' => $sitesSearch,
                'sort' => $sitesSort,
                'direction' => $sitesDirection,
                'per_page' => $sitesPerPage,
            ],
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'stats' => [
                'sites' => Site::query()->count(),
                'sites_active' => Site::query()->where('status', 'active')->count(),
                'places' => $placesInSite ? (clone $placesInSite)->count() : 0,
                'active' => $placesInSite
                    ? (clone $placesInSite)->where('status', 'active')->count()
                    : 0,
                'inactive' => $placesInSite
                    ? (clone $placesInSite)->where('status', 'inactive')->count()
                    : 0,
                'on_screen' => $places->count(),
            ],
        ]);
    }

    public function storeSite(SiteRequest $request): RedirectResponse
    {
        Site::query()->create($request->validated());

        return IndexedRedirect::toIndex($request, 'places.index', [
            'type' => 'success',
            'message' => 'Sede creada correctamente.',
        ]);
    }

    public function updateSite(SiteRequest $request, Site $site): RedirectResponse
    {
        $site->update($request->validated());

        return IndexedRedirect::toIndex($request, 'places.index', [
            'type' => 'success',
            'message' => 'Sede actualizada correctamente.',
        ]);
    }

    public function destroySite(Request $request, Site $site): RedirectResponse
    {
        if ($site->places()->exists()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar una sede que tiene lugares.',
            ]);
        }

        $site->delete();

        return IndexedRedirect::toIndex($request, 'places.index', [
            'type' => 'success',
            'message' => 'Sede eliminada correctamente.',
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
