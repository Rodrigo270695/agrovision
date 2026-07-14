<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Http\Requests\UserRolesRequest;
use App\Models\User;
use App\Support\IndexedRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private const PROTECTED_ROLE = 'superadmin';

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
            ->with('roles:id,name')
            ->withCount('roles');

        if ($search !== '') {
            $usersQuery->where(function ($query) use ($search) {
                $query
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('document_number', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        $usersQuery->orderBy($sort, $direction);

        $users = $usersQuery
            ->paginate($perPage)
            ->withQueryString();

        $withoutRoles = User::query()
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
            'stats' => [
                'users' => User::query()->count(),
                'with_roles' => User::query()->whereHas('roles')->count(),
                'page' => $users->currentPage().'/'.max($users->lastPage(), 1),
                'on_screen' => $users->count(),
                'without_roles' => $withoutRoles,
            ],
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'document_type' => $data['document_type'],
            'document_number' => $data['document_number'],
            'phone' => $data['phone'],
            'password' => $data['password'],
            'email_verified_at' => now(),
        ]);

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

        $user->syncRoles($request->validated('roles'));

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
        return $user->hasRole(self::PROTECTED_ROLE);
    }
}
