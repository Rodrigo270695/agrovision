<?php

namespace App\Support;

final class TenantModules
{
    /**
     * @return array<string, string>
     */
    public static function catalog(): array
    {
        return [
            'dashboard' => 'Panel',
            'pareto' => 'Pareto',
            'periods' => 'Periodos',
            'units' => 'Unidades',
            'checklists' => 'Inspecciones',
            'consolidations' => 'Consolidados',
            'alcoholtests' => 'Alcohómetro',
            'inductions' => 'Inducción',
            'users' => 'Usuarios',
            'roles' => 'Roles',
        ];
    }

    /**
     * @return array<string, bool>
     */
    public static function defaults(): array
    {
        return array_map(static fn (): bool => true, self::catalog());
    }

    public static function fromPermission(?string $permission): ?string
    {
        if (! filled($permission)) {
            return null;
        }

        $group = explode('.', $permission)[0];

        return array_key_exists($group, self::catalog()) ? $group : null;
    }

    public static function fromRouteName(?string $routeName): ?string
    {
        if (! filled($routeName)) {
            return null;
        }

        $map = [
            'dashboard' => 'dashboard',
            'pareto' => 'pareto',
            'periods' => 'periods',
            'units' => 'units',
            'lookups' => 'units',
            'checklists' => 'checklists',
            'consolidations' => 'consolidations',
            'alcohol-tests' => 'alcoholtests',
            'inductions' => 'inductions',
            'users' => 'users',
            'roles' => 'roles',
        ];

        foreach ($map as $prefix => $module) {
            if ($routeName === $prefix || str_starts_with($routeName, $prefix.'.')) {
                return $module;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, bool>
     */
    public static function sanitize(array $input): array
    {
        $modules = self::defaults();

        foreach (array_keys($modules) as $key) {
            if (array_key_exists($key, $input)) {
                $modules[$key] = filter_var($input[$key], FILTER_VALIDATE_BOOLEAN);
            }
        }

        $modules['dashboard'] = true;
        $modules['users'] = true;
        $modules['roles'] = true;

        return $modules;
    }
}
