<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdmin = Role::query()->firstOrCreate(
            [
                'name' => 'superadmin',
                'guard_name' => 'web',
            ],
        );

        $user = User::query()->updateOrCreate(
            ['email' => 'admin@agrovision.com'],
            [
                'name' => 'Administrador',
                'password' => 'password',
                'email_verified_at' => now(),
            ],
        );

        $user->syncRoles([$superAdmin]);
    }
}
