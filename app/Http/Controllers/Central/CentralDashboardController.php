<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class CentralDashboardController extends Controller
{
    public function __invoke(): Response
    {
        $tenants = Tenant::query()
            ->with('domains')
            ->orderByDesc('created_at')
            ->get();

        $active = $tenants->where('status', Tenant::STATUS_ACTIVE)->count();
        $suspended = $tenants->where('status', Tenant::STATUS_SUSPENDED)->count();
        $thisMonth = $tenants
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
        $prevMonth = $tenants
            ->where('created_at', '>=', now()->subMonth()->startOfMonth())
            ->where('created_at', '<', now()->startOfMonth())
            ->count();
        $domains = $tenants->sum(fn (Tenant $tenant) => $tenant->domains->count());

        $activity = $tenants->map(fn (Tenant $tenant) => $this->tenantActivity($tenant));
        $users = $activity->sum('users');
        $units = $activity->sum('units');

        $monthChart = collect(range(5, 0))->map(function (int $offset) use ($tenants) {
            $start = now()->subMonths($offset)->startOfMonth();
            $end = (clone $start)->endOfMonth();

            return [
                'label' => $start->locale('es')->translatedFormat('M Y'),
                'value' => $tenants
                    ->filter(fn (Tenant $tenant) => $tenant->created_at
                        && Carbon::parse($tenant->created_at)->between($start, $end))
                    ->count(),
                'color' => '#1a2b4c',
            ];
        })->values();

        return Inertia::render('central/dashboard', [
            'generatedAt' => now()->timezone(config('app.timezone'))->toIso8601String(),
            'kpis' => [
                [
                    'key' => 'tenants',
                    'label' => 'Empresas',
                    'value' => $tenants->count(),
                    'hint' => 'Tenants provisionados',
                    'tone' => 'blue',
                    'href' => '/plataforma/empresas',
                    'delta' => $thisMonth - $prevMonth,
                    'deltaLabel' => 'vs mes anterior',
                ],
                [
                    'key' => 'active',
                    'label' => 'Activas',
                    'value' => $active,
                    'hint' => 'Listas para operar',
                    'tone' => 'green',
                    'href' => '/plataforma/empresas?status=active',
                ],
                [
                    'key' => 'suspended',
                    'label' => 'Suspendidas',
                    'value' => $suspended,
                    'hint' => 'Acceso bloqueado',
                    'tone' => 'amber',
                    'href' => '/plataforma/empresas?status=suspended',
                ],
                [
                    'key' => 'domains',
                    'label' => 'Dominios',
                    'value' => $domains,
                    'hint' => 'Hosts registrados',
                    'tone' => 'indigo',
                ],
                [
                    'key' => 'users',
                    'label' => 'Usuarios tenant',
                    'value' => $users,
                    'hint' => 'Cuentas en todos los schemas',
                    'tone' => 'violet',
                ],
                [
                    'key' => 'units',
                    'label' => 'Unidades',
                    'value' => $units,
                    'hint' => 'Flota consolidada',
                    'tone' => 'teal',
                ],
            ],
            'charts' => [
                'status' => [
                    ['label' => 'Activas', 'value' => $active, 'color' => '#3d8b6e'],
                    ['label' => 'Suspendidas', 'value' => $suspended, 'color' => '#d4a84b'],
                ],
                'created' => $monthChart,
                'units' => $activity
                    ->sortByDesc('units')
                    ->take(8)
                    ->map(fn (array $row) => [
                        'label' => $row['name'],
                        'value' => $row['units'],
                        'color' => '#2e5a9e',
                    ])
                    ->values(),
            ],
            'recent' => $tenants->take(6)->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'schema' => $tenant->schemaName(),
                'domains' => $tenant->hostnames(),
                'url' => $tenant->url('login'),
                'created_at' => $tenant->created_at?->toIso8601String(),
                'users' => $activity->firstWhere('id', $tenant->id)['users'] ?? 0,
                'units' => $activity->firstWhere('id', $tenant->id)['units'] ?? 0,
            ])->values(),
        ]);
    }

    /**
     * @return array{id: string, name: string, users: int, units: int}
     */
    private function tenantActivity(Tenant $tenant): array
    {
        $row = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'users' => 0,
            'units' => 0,
        ];

        try {
            $tenant->run(function () use (&$row): void {
                $row['users'] = Schema::hasTable('users')
                    ? (int) DB::table('users')->count()
                    : 0;
                $row['units'] = Schema::hasTable('units')
                    ? (int) DB::table('units')->count()
                    : 0;
            });
        } catch (Throwable) {
            // Schema no disponible en este entorno.
        }

        return $row;
    }
}
