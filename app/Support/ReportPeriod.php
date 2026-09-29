<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class ReportPeriod
{
    public const WEEK = 'week';

    public const MONTH = 'month';

    public const YEAR = 'year';

    /**
     * @var array<int, string>
     */
    private const MONTHS = [
        1 => 'Enero',
        2 => 'Febrero',
        3 => 'Marzo',
        4 => 'Abril',
        5 => 'Mayo',
        6 => 'Junio',
        7 => 'Julio',
        8 => 'Agosto',
        9 => 'Septiembre',
        10 => 'Octubre',
        11 => 'Noviembre',
        12 => 'Diciembre',
    ];

    public static function view(?string $view): string
    {
        return in_array($view, [self::WEEK, self::MONTH, self::YEAR], true)
            ? $view
            : self::WEEK;
    }

    /**
     * @return array{value: string, label: string, number: int|null, from: string|null, to: string|null}
     */
    public static function resolve(string $view, ?string $requested, string $allLabel): array
    {
        $view = self::view($view);

        if ($requested === 'all') {
            return self::all($view, $allLabel);
        }

        $parsed = self::parse($view, $requested);

        if ($parsed !== null) {
            return $parsed;
        }

        return self::current($view);
    }

    /**
     * @param  Collection<int, mixed>|iterable<int, mixed>  $dates
     * @return list<array{value: string, label: string}>
     */
    public static function options(string $view, iterable $dates, string $allLabel): array
    {
        $view = self::view($view);
        $keys = collect($dates)
            ->map(fn ($date) => self::keyFor($view, $date))
            ->filter()
            ->push(self::current($view)['value'])
            ->unique()
            ->sortDesc()
            ->take(match ($view) {
                self::YEAR => 8,
                self::MONTH => 24,
                default => 16,
            })
            ->values();

        $options = [self::all($view, $allLabel)];

        foreach ($keys as $key) {
            $payload = self::parse($view, (string) $key);

            if ($payload === null) {
                continue;
            }

            $options[] = [
                'value' => $payload['value'],
                'label' => $payload['label'],
            ];
        }

        return $options;
    }

    /**
     * @return array{value: string, label: string, number: null, from: null, to: null}
     */
    private static function all(string $view, string $weekLabel): array
    {
        $label = match ($view) {
            self::MONTH => 'Todos los meses',
            self::YEAR => 'Todos los años',
            default => $weekLabel,
        };

        return [
            'value' => 'all',
            'label' => $label,
            'number' => null,
            'from' => null,
            'to' => null,
        ];
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}
     */
    private static function current(string $view): array
    {
        $today = CarbonImmutable::now();

        $value = match ($view) {
            self::MONTH => $today->format('Y-m'),
            self::YEAR => $today->format('Y'),
            default => $today->startOfWeek(CarbonImmutable::MONDAY)->toDateString(),
        };

        return self::parse($view, $value) ?? self::weekPayload($today->startOfWeek(CarbonImmutable::MONDAY));
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}|null
     */
    private static function parse(string $view, ?string $value): ?array
    {
        if ($value === null || $value === '' || $value === 'all') {
            return null;
        }

        return match ($view) {
            self::MONTH => self::monthPayload($value),
            self::YEAR => self::yearPayload($value),
            default => self::weekFrom($value),
        };
    }

    private static function keyFor(string $view, mixed $date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }

        try {
            $parsed = CarbonImmutable::parse($date);
        } catch (\Throwable) {
            return null;
        }

        return match ($view) {
            self::MONTH => $parsed->format('Y-m'),
            self::YEAR => $parsed->format('Y'),
            default => $parsed->startOfWeek(CarbonImmutable::MONDAY)->toDateString(),
        };
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}|null
     */
    private static function weekFrom(string $value): ?array
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        try {
            $monday = CarbonImmutable::parse($value)->startOfWeek(CarbonImmutable::MONDAY);
        } catch (\Throwable) {
            return null;
        }

        return self::weekPayload($monday);
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}
     */
    private static function weekPayload(CarbonInterface $monday): array
    {
        $start = CarbonImmutable::parse($monday)->startOfDay();
        $end = $start->addDays(6);

        return [
            'value' => $start->toDateString(),
            'label' => 'Semana '.$start->isoWeek().' · '.$start->format('d/m').' al '.$end->format('d/m'),
            'number' => $start->isoWeek(),
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
        ];
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}|null
     */
    private static function monthPayload(string $value): ?array
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $value)) {
            return null;
        }

        $start = CarbonImmutable::createFromFormat('!Y-m-d', $value.'-01');

        if ($start === false) {
            return null;
        }

        $start = $start->startOfDay();
        $end = $start->endOfMonth()->startOfDay();

        return [
            'value' => $start->format('Y-m'),
            'label' => (self::MONTHS[$start->month] ?? $start->format('m')).' '.$start->year,
            'number' => $start->month,
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
        ];
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}|null
     */
    private static function yearPayload(string $value): ?array
    {
        if (! preg_match('/^\d{4}$/', $value)) {
            return null;
        }

        $start = CarbonImmutable::create((int) $value, 1, 1)?->startOfDay();

        if ($start === null) {
            return null;
        }

        $end = $start->endOfYear()->startOfDay();

        return [
            'value' => (string) $start->year,
            'label' => (string) $start->year,
            'number' => $start->year,
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
        ];
    }
}
