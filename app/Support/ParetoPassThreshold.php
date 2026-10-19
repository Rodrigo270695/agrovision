<?php

namespace App\Support;

/**
 * Umbral Pareto para aprobar / desaprobar una inspección.
 */
final class ParetoPassThreshold
{
    public const MIN_PERCENT = 85.0;

    public const FULL_PERCENT = 100.0;

    public static function passes(float $scoredPercent): bool
    {
        return round($scoredPercent, 2) >= self::MIN_PERCENT;
    }

    /**
     * @param  iterable<mixed>  $answers
     * @return array{percent: float, has_no: bool}
     */
    public static function snapshot(iterable $answers, string $valueField = 'first_value'): array
    {
        $scored = 0.0;
        $catalog = 0.0;
        $hasNo = false;

        foreach ($answers as $answer) {
            $item = is_object($answer) ? ($answer->item ?? null) : ($answer['item'] ?? null);
            $weight = (float) (is_object($item) ? ($item->weight ?? 0) : ($item['weight'] ?? 0));
            $catalog += $weight;
            $value = is_object($answer) ? ($answer->{$valueField} ?? null) : ($answer[$valueField] ?? null);

            if ($value === 'yes') {
                $scored += $weight;
            }

            if ($value === 'no') {
                $hasNo = true;
            }
        }

        return [
            'percent' => $catalog > 0 ? round(($scored / $catalog) * 100, 2) : 0.0,
            'has_no' => $hasNo,
        ];
    }

    /**
     * rejected | approved_notes | approved
     */
    public static function grade(float $percent, bool $hasNo = false): string
    {
        if (round($percent, 2) < self::MIN_PERCENT) {
            return 'rejected';
        }

        if (round($percent, 2) >= self::FULL_PERCENT && ! $hasNo) {
            return 'approved';
        }

        return 'approved_notes';
    }

    /**
     * Vista: el resultado guardado manda (approved ≥ 85), el Pareto pinta ámbar o verde.
     */
    public static function displayGrade(?string $storedResult, float $percent, bool $hasNo = false): string
    {
        if ($storedResult === 'rejected') {
            return 'rejected';
        }

        if ($storedResult !== 'approved') {
            return 'pending';
        }

        return self::grade($percent, $hasNo) === 'approved'
            ? 'approved'
            : 'approved_notes';
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
