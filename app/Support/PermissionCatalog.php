<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

final class PermissionCatalog
{
    /**
     * @return array<string, array{label: string, module: string}>
     */
    public static function definitions(): array
    {
        return [
            'dashboard.view' => ['label' => 'Ver panel', 'module' => 'Panel'],

            'roles.view' => ['label' => 'Ver roles', 'module' => 'Roles'],
            'roles.create' => ['label' => 'Crear roles', 'module' => 'Roles'],
            'roles.update' => ['label' => 'Editar roles', 'module' => 'Roles'],
            'roles.delete' => ['label' => 'Eliminar roles', 'module' => 'Roles'],
            'roles.assign' => ['label' => 'Asignar permisos', 'module' => 'Roles'],

            'users.view' => ['label' => 'Ver usuarios', 'module' => 'Usuarios'],
            'users.create' => ['label' => 'Crear usuarios', 'module' => 'Usuarios'],
            'users.update' => ['label' => 'Editar usuarios', 'module' => 'Usuarios'],
            'users.delete' => ['label' => 'Eliminar usuarios', 'module' => 'Usuarios'],

            'units.view' => ['label' => 'Ver unidades', 'module' => 'Unidades'],
            'units.create' => ['label' => 'Crear unidades', 'module' => 'Unidades'],
            'units.update' => ['label' => 'Editar unidades', 'module' => 'Unidades'],
            'units.delete' => ['label' => 'Eliminar unidades', 'module' => 'Unidades'],

            'periods.view' => ['label' => 'Ver periodos', 'module' => 'Periodos'],
            'periods.create' => ['label' => 'Crear periodos', 'module' => 'Periodos'],
            'periods.update' => ['label' => 'Editar periodos', 'module' => 'Periodos'],
            'periods.delete' => ['label' => 'Eliminar periodos', 'module' => 'Periodos'],

            'checklists.view' => ['label' => 'Ver checklists', 'module' => 'Checklists'],
            'checklists.create' => ['label' => 'Crear checklists', 'module' => 'Checklists'],
            'checklists.update' => ['label' => 'Editar checklists', 'module' => 'Checklists'],
            'checklists.delete' => ['label' => 'Eliminar checklists', 'module' => 'Checklists'],

            'consolidations.view' => ['label' => 'Ver consolidados', 'module' => 'Consolidados'],
            'consolidations.respond' => ['label' => 'Responder consolidados', 'module' => 'Consolidados'],

            'pareto.view' => ['label' => 'Ver Pareto', 'module' => 'Pareto'],
            'pareto.create' => ['label' => 'Crear Pareto', 'module' => 'Pareto'],
            'pareto.update' => ['label' => 'Editar Pareto', 'module' => 'Pareto'],
            'pareto.delete' => ['label' => 'Eliminar Pareto', 'module' => 'Pareto'],

            'inductions.view' => ['label' => 'Ver inducciones', 'module' => 'Inducción'],
            'inductions.create' => ['label' => 'Crear inducciones', 'module' => 'Inducción'],
            'inductions.update' => ['label' => 'Editar inducciones', 'module' => 'Inducción'],
            'inductions.delete' => ['label' => 'Eliminar inducciones', 'module' => 'Inducción'],
        ];
    }

    /**
     * @return list<string>
     */
    public static function names(): array
    {
        return array_keys(self::definitions());
    }

    /**
     * Crea en BD cualquier permiso del catálogo que falte.
     */
    public static function syncToDatabase(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::names() as $name) {
            Permission::findOrCreate($name, 'web');
        }
    }

    /**
     * @return list<array{id: int|null, name: string, label: string, module: string}>
     */
    public static function forFrontend(?iterable $permissions = null): array
    {
        $definitions = self::definitions();
        $items = [];

        if ($permissions === null) {
            foreach ($definitions as $name => $meta) {
                $items[] = [
                    'id' => null,
                    'name' => $name,
                    'label' => $meta['label'],
                    'module' => $meta['module'],
                ];
            }

            return $items;
        }

        $byName = [];

        foreach ($permissions as $permission) {
            $name = is_string($permission) ? $permission : (string) $permission->name;
            $byName[$name] = is_object($permission) ? (int) $permission->id : null;
        }

        foreach ($definitions as $name => $meta) {
            $items[] = [
                'id' => $byName[$name] ?? null,
                'name' => $name,
                'label' => $meta['label'],
                'module' => $meta['module'],
            ];
        }

        foreach ($byName as $name => $id) {
            if (isset($definitions[$name])) {
                continue;
            }

            $items[] = [
                'id' => $id,
                'name' => $name,
                'label' => $name,
                'module' => 'Otros',
            ];
        }

        return $items;
    }
}
