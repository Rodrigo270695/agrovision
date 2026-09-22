<?php

namespace Tests\Concerns;

use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Support\TenantModules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

trait InteractsWithTenancy
{
    protected string $tenantHost = 'agrovision.localhost';

    protected function setUpTenancy(): void
    {
        if (! DB::table('tenants')->where('id', 'agrovision')->exists()) {
            DB::table('tenants')->insert([
                'id' => 'agrovision',
                'name' => 'Agrovision',
                'status' => Tenant::STATUS_ACTIVE,
                'data' => '{}',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $tenant = Tenant::query()->findOrFail('agrovision');

        if (! $tenant->domains()->where('domain', $this->tenantHost)->exists()) {
            DB::table('domains')->insert([
                'domain' => $this->tenantHost,
                'tenant_id' => $tenant->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $tenant->load('domains');
        }

        TenantSetting::query()->firstOrCreate(
            [],
            [
                'name' => 'Agrovision',
                'primary_color' => '#1a2b4c',
                'modules' => TenantModules::defaults(),
            ],
        );

        config(['app.url' => 'http://'.$this->tenantHost]);
        URL::forceRootUrl('http://'.$this->tenantHost);

        $this->withServerVariables([
            'SERVER_NAME' => $this->tenantHost,
            'HTTP_HOST' => $this->tenantHost,
        ]);
        $this->withHeader('Host', $this->tenantHost);

        tenancy()->initialize($tenant);
    }

    protected function actingOnCentral(): static
    {
        if (tenancy()->initialized) {
            tenancy()->end();
        }

        config(['app.url' => 'http://localhost']);
        URL::forceRootUrl('http://localhost');

        $this->withServerVariables([
            'SERVER_NAME' => 'localhost',
            'HTTP_HOST' => 'localhost',
        ]);
        $this->withHeader('Host', 'localhost');

        return $this;
    }
}
