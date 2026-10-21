<?php

namespace App\Support;

/**
 * La sede operativa de la unidad viene del Excel (columna RUTA).
 */
final class UnitSede
{
    public static function label(?string $route, ?string $catalogSede = null, ?int $coordinatorId = null): string
    {
        $route = trim((string) $route);
        if ($route !== '') {
            return $route;
        }

        $catalog = trim((string) $catalogSede);
        if ($catalog !== '') {
            return $catalog;
        }

        return CoordinatorSede::forCoordinatorId($coordinatorId);
    }
}
