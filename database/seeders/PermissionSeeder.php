<?php

namespace Database\Seeders;

use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registrar = app()[PermissionRegistrar::class];
        $registrar->forgetCachedPermissions();

        $permissions = [];

        foreach (PermissionCatalog::names() as $name) {
            $permissions[] = Permission::findOrCreate($name, 'web');
        }

        $registrar->forgetCachedPermissions();

        $superAdmin = Role::findOrCreate('superadmin', 'web');
        $superAdmin->syncPermissions($permissions);

        $coordinador = Role::findOrCreate(\App\Support\SystemRoles::COORDINADOR, 'web');
        $coordinadorPermissions = collect($permissions)
            ->filter(fn (Permission $permission) => in_array($permission->name, [
                'dashboard.view',
                'units.view',
                'units.create',
                'units.update',
                'checklists.view',
                'checklists.create',
                'checklists.update',
                'consolidations.view',
                'consolidations.respond',
                'inductions.view',
                'inductions.create',
                'inductions.update',
                'periods.view',
                'pareto.view',
                'pareto.update',
            ], true))
            ->all();
        $coordinador->syncPermissions($coordinadorPermissions);

        $inspector = Role::findOrCreate(\App\Support\SystemRoles::INSPECTOR, 'web');
        $inspectorPermissions = collect($permissions)
            ->filter(fn (Permission $permission) => in_array($permission->name, [
                'dashboard.view',
                'units.view',
                'checklists.view',
                'checklists.create',
                'checklists.update',
                'consolidations.view',
                'periods.view',
                'pareto.view',
            ], true))
            ->all();
        $inspector->syncPermissions($inspectorPermissions);
    }
}
