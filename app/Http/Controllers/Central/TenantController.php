<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Http\Requests\Central\StoreTenantRequest;
use App\Http\Requests\Central\UpdateTenantRequest;
use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Services\TenantCreator;
use App\Services\TenantSupportUser;
use App\Support\TenantModules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['todos', 'active', 'suspended'])],
            'sort' => ['nullable', Rule::in(['name', 'id', 'status', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([10, 15, 20, 25, 50, 100])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $status = $validated['status'] ?? 'todos';
        $sort = $validated['sort'] ?? 'name';
        $direction = $validated['direction'] ?? 'asc';
        $perPage = (int) ($validated['per_page'] ?? 10);
        $like = Tenant::query()->getConnection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $query = Tenant::query()->with('domains');

        if ($search !== '') {
            $query->where(function ($builder) use ($search, $like): void {
                $builder
                    ->where('name', $like, "%{$search}%")
                    ->orWhere('id', $like, "%{$search}%")
                    ->orWhereHas('domains', fn ($domains) => $domains->where('domain', $like, "%{$search}%"));
            });
        }

        if ($status !== 'todos') {
            $query->where('status', $status);
        }

        $tenants = $query
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'schema' => $tenant->schemaName(),
                'domains' => $tenant->hostnames(),
                'url' => $tenant->url('login'),
                'created_at' => $tenant->created_at?->toIso8601String(),
            ]);

        return Inertia::render('central/tenants/index', [
            'tenants' => $tenants,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => Tenant::query()->count(),
                'active' => Tenant::query()->where('status', Tenant::STATUS_ACTIVE)->count(),
                'suspended' => Tenant::query()->where('status', Tenant::STATUS_SUSPENDED)->count(),
                'matches' => $tenants->total(),
            ],
            'modules' => TenantModules::catalog(),
        ]);
    }

    public function store(StoreTenantRequest $request, TenantCreator $creator): RedirectResponse
    {
        $creator->create($request->validated());

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Empresa creada correctamente.',
        ]);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant): RedirectResponse
    {
        $tenant->update($request->safe()->only(['name', 'status']));

        if ($request->has('modules')) {
            $tenant->run(function () use ($request): void {
                $settings = TenantSetting::current();
                $settings->update([
                    'name' => $request->input('name', $settings->name),
                    'modules' => TenantModules::sanitize($request->input('modules', [])),
                ]);
            });
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Empresa actualizada correctamente.',
        ]);
    }

    public function suspend(Tenant $tenant): RedirectResponse
    {
        $tenant->update(['status' => Tenant::STATUS_SUSPENDED]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Empresa suspendida.',
        ]);
    }

    public function activate(Tenant $tenant): RedirectResponse
    {
        $tenant->update(['status' => Tenant::STATUS_ACTIVE]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Empresa activada.',
        ]);
    }

    public function impersonate(Request $request, Tenant $tenant, TenantSupportUser $supportUser): HttpResponse
    {
        if (! $tenant->isActive()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No puedes entrar a una empresa suspendida.',
            ]);
        }

        $userId = $tenant->run(fn (): int => $supportUser->findOrCreate()->id);

        $redirectUrl = $tenant->url('dashboard', $request);
        $token = tenancy()->impersonate($tenant, (string) $userId, $redirectUrl, 'web');
        $returnUrl = $request->getScheme().'://'.$request->getHttpHost().'/plataforma';
        $impersonateUrl = $tenant->url('impersonate/'.$token->token, $request)
            .'?return='.rawurlencode($returnUrl);

        if ($request->header('X-Inertia')) {
            return Inertia::location($impersonateUrl);
        }

        return redirect($impersonateUrl);
    }
}
