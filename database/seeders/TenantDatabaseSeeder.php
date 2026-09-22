<?php

namespace Database\Seeders;

use App\Models\TenantSetting;
use App\Models\User;
use App\Support\SystemRoles;
use App\Support\TenantModules;
use App\Support\TenantProvisioning;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            ChecklistTemplateSeeder::class,
            ParetoSeeder::class,
        ]);

        $provisioning = app()->bound(TenantProvisioning::class)
            ? app(TenantProvisioning::class)
            : new TenantProvisioning(
                adminName: 'Administrador',
                adminEmail: 'admin@'.(tenant('id') ?? 'tenant').'.local',
                adminPassword: 'password',
                modules: TenantModules::defaults(),
                brandingName: (string) (tenant('name') ?? tenant('id') ?? 'Empresa'),
            );

        $settings = TenantSetting::query()->first();

        if ($settings) {
            $settings->update([
                'name' => $provisioning->brandingName,
                'modules' => $provisioning->modules,
            ]);
        } else {
            TenantSetting::query()->create([
                'name' => $provisioning->brandingName,
                'modules' => $provisioning->modules,
                'primary_color' => '#1a2b4c',
            ]);
        }

        $superAdmin = Role::query()->firstOrCreate([
            'name' => SystemRoles::SUPERADMIN,
            'guard_name' => 'web',
        ]);

        $user = User::query()->updateOrCreate(
            ['email' => $provisioning->adminEmail],
            [
                'name' => $provisioning->adminName,
                'password' => $provisioning->adminPassword,
                'email_verified_at' => now(),
                'is_support' => false,
            ],
        );

        $user->syncRoles([$superAdmin]);
    }
}
