<?php

namespace App\Support;

use App\Models\Place;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Cruza la sede y la garita de una unidad con los lugares que el coordinador tiene hoy.
 */
final class CoordinatorPlaceLabel
{
    public static function forCoordinator(?User $coordinator, ?string $sede, ?string $garita): string
    {
        $places = $coordinator?->places;

        if ($places === null || $places->isEmpty()) {
            return '';
        }

        $sedeKey = self::key($sede);
        $garitaKey = self::key($garita);
        $bestScore = 0;
        $winners = collect();

        foreach ($places as $place) {
            $score = self::score($place, $sedeKey, $garitaKey);

            if ($score > $bestScore) {
                $bestScore = $score;
                $winners = collect([$place]);
            } elseif ($score > 0 && $score === $bestScore) {
                $winners->push($place);
            }
        }

        if ($winners->isEmpty()) {
            return $places->count() === 1 ? self::format($places) : '';
        }

        return self::format($winners);
    }

    private static function score(Place $place, string $sedeKey, string $garitaKey): int
    {
        $siteKey = self::key($place->site?->name);
        $nameKey = self::key($place->name);
        $score = 0;

        if ($sedeKey !== '' && $siteKey !== '' && self::same($sedeKey, $siteKey)) {
            $score += 2;
        }

        if ($garitaKey !== '' && $nameKey !== '' && self::same($garitaKey, $nameKey)) {
            $score += 3;
        }

        return $score;
    }

    private static function same(string $left, string $right): bool
    {
        return $left === $right || str_contains($left, $right) || str_contains($right, $left);
    }

    private static function key(?string $value): string
    {
        $value = mb_strtoupper(trim((string) $value));
        $value = str_replace(['–', '—', '-', '_', '.', ',', ':'], ' ', $value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * @param  Collection<int, Place>  $places
     */
    private static function format(Collection $places): string
    {
        $grouped = [];

        foreach ($places as $place) {
            $site = trim((string) ($place->site?->name ?? ''));
            $grouped[$site][] = $place->name;
        }

        $labels = [];

        foreach ($grouped as $site => $names) {
            $names = array_values(array_unique($names));
            $labels[] = $site !== ''
                ? $site.': '.implode(', ', $names)
                : implode(', ', $names);
        }

        return implode(' · ', $labels);
    }
}
