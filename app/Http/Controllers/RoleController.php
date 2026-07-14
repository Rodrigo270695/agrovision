<?php

namespace App\Http\Controllers;

use App\Http\Requests\RolePermissionsRequest;
use App\Http\Requests\RoleRequest;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const PROTECTED_ROLE = 'superadmin';

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:125'],
            'sort' => ['nullable', Rule::in(['name', 'permissions_count', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        PermissionCatalog::syncToDatabase();

        $rolesQuery = Role::query()
            ->with('permissions')
            ->withCount('permissions');

        if ($search !== '') {
            $rolesQuery->where('name', 'ilike', "%{$search}%");
        }

        $rolesQuery->orderBy($sort, $direction);

        $roles = $rolesQuery
            ->paginate($perPage)
            ->withQueryString();

        $permissionTypes = Permission::query()->count();
        $rolesWithoutPermissions = Role::query()
            ->whereDoesntHave('permissions')
            ->count();

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'permissionCatalog' => PermissionCatalog::forFrontend(
                Permission::query()->orderBy('name')->get(['id', 'name']),
            ),
            'stats' => [
                'roles' => Role::query()->count(),
                'permission_types' => $permissionTypes,
                'page' => $roles->currentPage().'/'.max($roles->lastPage(), 1),
                'on_screen' => $roles->count(),
                'without_permissions' => $rolesWithoutPermissions,
            ],
        ]);
    }

    public function store(RoleRequest $request): RedirectResponse
    {
        $name = $request->validated('name');

        if (strcasecmp($name, self::PROTECTED_ROLE) === 0) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El rol superadmin está reservado y no se puede crear.',
            ]);
        }

        Role::create([
            'name' => $name,
            'guard_name' => 'web',
        ]);

        return IndexedRedirect::toIndex($request, 'roles.index', [
            'type' => 'success',
            'message' => 'Rol creado correctamente.',
        ]);
    }

    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        if ($this->isProtected($role)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El rol superadmin no se puede modificar.',
            ]);
        }

        $name = $request->validated('name');

        if (strcasecmp($name, self::PROTECTED_ROLE) === 0) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El nombre superadmin está reservado.',
            ]);
        }

        $role->update([
            'name' => $name,
        ]);

        return IndexedRedirect::toIndex($request, 'roles.index', [
            'type' => 'success',
            'message' => 'Rol actualizado correctamente.',
        ]);
    }

    public function syncPermissions(RolePermissionsRequest $request, Role $role): RedirectResponse
    {
        if ($this->isProtected($role)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El rol superadmin no se puede modificar.',
            ]);
        }

        $role->syncPermissions($request->validated('permissions'));

        return IndexedRedirect::toIndex($request, 'roles.index', [
            'type' => 'success',
            'message' => 'Permisos actualizados correctamente.',
        ]);
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        if ($this->isProtected($role)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El rol superadmin no se puede eliminar.',
            ]);
        }

        $role->delete();

        return IndexedRedirect::toIndex($request, 'roles.index', [
            'type' => 'success',
            'message' => 'Rol eliminado correctamente.',
        ]);
    }

    private function isProtected(Role $role): bool
    {
        return strcasecmp($role->name, self::PROTECTED_ROLE) === 0;
    }
}
