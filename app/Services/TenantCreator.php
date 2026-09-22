<?php

namespace App\Services;

use App\Models\Tenant;
use App\Support\TenantModules;
use App\Support\TenantProvisioning;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantCreator
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Tenant
    {
        $slug = Str::slug((string) $data['id']);
        $modules = TenantModules::sanitize($data['modules'] ?? []);

        app()->instance(TenantProvisioning::class, new TenantProvisioning(
            adminName: (string) $data['admin_name'],
            adminEmail: (string) $data['admin_email'],
            adminPassword: (string) $data['admin_password'],
            modules: $modules,
            brandingName: (string) ($data['name'] ?? $slug),
        ));

        $tenant = Tenant::create([
            'id' => $slug,
            'name' => $data['name'],
            'status' => Tenant::STATUS_ACTIVE,
        ]);

        $this->registerDomains($tenant);

        return $tenant->fresh(['domains']) ?? $tenant;
    }

    public function registerDomains(Tenant $tenant): void
    {
        $bases = config('tenancy.base_domains', []);

        foreach ($bases as $base) {
            $hostname = $tenant->id.'.'.$base;

            $exists = DB::connection(config('tenancy.database.central_connection'))
                ->table('domains')
                ->where('domain', $hostname)
                ->exists();

            if (! $exists) {
                $tenant->domains()->create(['domain' => $hostname]);
            }
        }
    }
}
