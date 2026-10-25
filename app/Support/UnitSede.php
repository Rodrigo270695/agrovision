<?php

namespace App\Support;

/**
 * Sede operativa de la unidad (columna SEDE del Excel de unidades).
 */
final class UnitSede
{
    public static function label(?string $unitSede, ?string $catalogSede = null, ?int $coordinatorId = null): string
    {
        $sede = trim((string) $unitSede);
        if ($sede !== '') {
            return $sede;
        }

        $catalog = trim((string) $catalogSede);
        if ($catalog !== '') {
            return $catalog;
        }

        return CoordinatorSede::forCoordinatorId($coordinatorId);
    }
}
