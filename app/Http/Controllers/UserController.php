<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Http\Requests\UserRolesRequest;
use App\Models\Place;
use App\Models\User;
use App\Support\IndexedRedirect;
use App\Support\SystemRoles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['name', 'email', 'roles_count', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $usersQuery = User::query()
            ->withoutSupport()
            ->with([
                'roles:id,name',
                'place:id,name,site_id',
                'place.site:id,name',
                'places:id,name,site_id',
                'places.site:id,name',
            ])
            ->withCount('roles');

        if ($search !== '') {
            $usersQuery->where(function ($query) use ($search) {
                $query
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('document_number', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%")
                    ->orWhereHas('place', fn ($query) => $query->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('places', fn ($query) => $query->where('name', 'ilike', "%{$search}%"));
            });
        }

        $usersQuery->orderBy($sort, $direction);

        $users = $usersQuery
            ->paginate($perPage)
            ->withQueryString();

        $withoutRoles = User::query()
            ->withoutSupport()
            ->whereDoesntHave('roles')
            ->count();

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'roleOptions' => Role::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name']),
            'placeOptions' => Place::query()
                ->with('site:id,name')
                ->where('status', 'active')
                ->get(['id', 'site_id', 'name'])
                ->map(fn (Place $place) => [
                    'id' => $place->id,
                    'name' => $place->name,
                    'site_name' => $place->site?->name,
                ])
                ->sortBy([
                    ['site_name', 'asc'],
                    ['name', 'asc'],
                ])
                ->values(),
            'stats' => [
                'users' => User::query()->withoutSupport()->count(),
                'with_roles' => User::query()->withoutSupport()->whereHas('roles')->count(),
                'page' => $users->currentPage().'/'.max($users->lastPage(), 1),
                'on_screen' => $users->count(),
                'without_roles' => $withoutRoles,
            ],
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'document_type' => $data['document_type'],
            'document_number' => $data['document_number'],
            'phone' => $data['phone'],
            'place_id' => $data['place_id'] ?? null,
            'password' => $data['password'],
            'email_verified_at' => now(),
        ]);

        $this->syncPlaces($user, $user->place_id ? [$user->place_id] : []);

        return IndexedRedirect::toIndex($request, 'users.index', [
            'type' => 'success',
            'message' => 'Usuario creado correctamente.',
        ]);
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        if ($this->isProtected($user)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Este usuario está protegido y no se puede modificar.',
            ]);
        }

        $data = $request->validated();

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'document_type' => $data['document_type'],
            'document_number' => $data['document_number'],
            'phone' => $data['phone'],
        ];

        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
        }

        $user->update($payload);

        $placeIds = $user->hasRole(SystemRoles::COORDINADOR)
            ? ($data['place_ids'] ?? [])
            : (isset($data['place_id']) && $data['place_id']
                ? [(int) $data['place_id']]
                : []);

        $this->syncPlaces($user, $placeIds);

        return IndexedRedirect::toIndex($request, 'users.index', [
            'type' => 'success',
            'message' => 'Usuario actualizado correctamente.',
        ]);
    }

    public function syncRoles(UserRolesRequest $request, User $user): RedirectResponse
    {
        if ($this->isProtected($user)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Este usuario está protegido y no se pueden cambiar sus roles.',
            ]);
        }

        $roles = $request->validated('roles');
        $user->syncRoles($roles);

        $isCoordinator = in_array(SystemRoles::COORDINADOR, array_map(
            static fn ($name) => mb_strtolower((string) $name),
            $roles,
        ), true);

        $placeIds = $isCoordinator
            ? ($request->validated('place_ids') ?? [])
            : ($request->validated('place_id')
                ? [(int) $request->validated('place_id')]
                : []);

        $this->syncPlaces($user, $placeIds);

        return IndexedRedirect::toIndex($request, 'users.index', [
            'type' => 'success',
            'message' => 'Roles actualizados correctamente.',
        ]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($this->isProtected($user)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Este usuario está protegido y no se puede eliminar.',
            ]);
        }

        if (Auth::id() === $user->id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No puedes eliminar tu propia cuenta.',
            ]);
        }

        $user->delete();

        return IndexedRedirect::toIndex($request, 'users.index', [
            'type' => 'success',
            'message' => 'Usuario eliminado correctamente.',
        ]);
    }

    private function isProtected(User $user): bool
    {
        return (bool) $user->is_support;
    }

    /**
     * @param  array<int, int|string>  $placeIds
     */
    private function syncPlaces(User $user, array $placeIds): void
    {
        $ids = array_values(array_unique(array_map('intval', $placeIds)));

        $user->places()->sync($ids);
        $user->update(['place_id' => $ids[0] ?? null]);
    }
}
