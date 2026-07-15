<?php

namespace App\Support;

/**
 * Umbral Pareto para aprobar / desaprobar una inspección.
 */
final class ParetoPassThreshold
{
    public const MIN_PERCENT = 85.0;

    public static function passes(float $scoredPercent): bool
    {
        return round($scoredPercent, 2) >= self::MIN_PERCENT;
    }

    /**
     * Resultado efectivo en el consolidado: bajo el umbral siempre es desaprobado.
     */
    public static function resolveResult(float $scoredPercent, ?string $storedResult): ?string
    {
        if (! self::passes($scoredPercent)) {
            return 'rejected';
        }

        return $storedResult;
    }
}
