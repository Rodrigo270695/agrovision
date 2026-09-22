<?php

namespace App\Services;

use App\Models\User;
use App\Support\SystemRoles;
use Spatie\Permission\Models\Role;

class TenantSupportUser
{
    public function findOrCreate(): User
    {
        $role = Role::query()->firstOrCreate([
            'name' => SystemRoles::SUPERADMIN,
            'guard_name' => 'web',
        ]);

        $user = User::query()->firstOrCreate(
            ['email' => 'soporte@gindelsi.pe'],
            [
                'name' => 'Soporte Gindelsi',
                'password' => str()->random(32),
                'email_verified_at' => now(),
                'is_support' => true,
            ],
        );

        if (! $user->is_support) {
            $user->forceFill(['is_support' => true])->save();
        }

        $user->syncRoles([$role]);

        return $user;
    }
}
