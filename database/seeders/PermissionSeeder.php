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
    }
}
