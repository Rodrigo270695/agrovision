<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class ReportPeriod
{
    /**
     * @return array{from: string|null, to: string|null, label: string}
     */
    public static function range(mixed $from, mixed $to): array
    {
        $start = self::date($from);
        $end = self::date($to);

        if ($start !== null && $end !== null && $start > $end) {
            [$start, $end] = [$end, $start];
        }

        if ($start === null && $end === null) {
            return [
                'from' => null,
                'to' => null,
                'label' => 'Todas las fechas',
            ];
        }

        $start ??= $end;
        $end ??= $start;

        $fromLabel = CarbonImmutable::parse($start)->format('d/m/Y');
        $toLabel = CarbonImmutable::parse($end)->format('d/m/Y');

        return [
            'from' => $start,
            'to' => $end,
            'label' => $start === $end ? $fromLabel : $fromLabel.' — '.$toLabel,
        ];
    }

    private static function date(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
