<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;

/**
 * Roles de sistema: no se crean, renombran ni eliminan libremente.
 */
final class SystemRoles
{
    public const SUPERADMIN = 'superadmin';

    public const COORDINADOR = 'coordinador';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::SUPERADMIN,
            self::COORDINADOR,
        ];
    }

    public static function isSystem(Role|string $role): bool
    {
        $name = $role instanceof Role ? $role->name : $role;

        return in_array(mb_strtolower(trim($name)), self::all(), true);
    }

    /** No se puede editar el nombre ni eliminar. */
    public static function isLocked(Role|string $role): bool
    {
        return self::isSystem($role);
    }

    /** No se pueden cambiar permisos (solo superadmin). */
    public static function permissionsLocked(Role|string $role): bool
    {
        $name = $role instanceof Role ? $role->name : $role;

        return mb_strtolower(trim($name)) === self::SUPERADMIN;
    }

    public static function label(string $name): string
    {
        return match (mb_strtolower(trim($name))) {
            self::SUPERADMIN => 'Superadmin',
            self::COORDINADOR => 'Coordinador',
            default => $name,
        };
    }

    /**
     * Usuario con rol coordinador (y sin superadmin): solo ve lo suyo.
     */
    public static function currentIsScopedCoordinator(): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        return $user->hasRole(self::COORDINADOR) && ! $user->hasRole(self::SUPERADMIN);
    }

    /**
     * @return Collection<int, User>
     */
    public static function coordinators(): Collection
    {
        return User::role(self::COORDINADOR)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);
    }

    /**
     * @return array<string, int> nombre lower => user id
     */
    public static function coordinatorNameMap(): array
    {
        $map = [];

        foreach (self::coordinators() as $user) {
            $map[mb_strtolower(trim($user->name))] = $user->id;
        }

        return $map;
    }
}
