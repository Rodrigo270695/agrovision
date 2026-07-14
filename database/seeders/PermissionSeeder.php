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
                'inductions.view',
                'inductions.create',
                'inductions.update',
                'periods.view',
            ], true))
            ->all();
        $coordinador->syncPermissions($coordinadorPermissions);
    }
}
