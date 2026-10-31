<?php

namespace App\Support;

use App\Models\InductionType;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de temas de inducción/capacitación (DB + defaults semilla).
 * Las sesiones (paquetes) apuntan a un tipo por slug.
 */
final class InductionTypeCatalog
{
    public const SST = 'sst';

    public const MANEJO_DEFENSIVA = 'manejo_defensiva';

    public const USO_EXTINTORES = 'uso_extintores';

    public const TRANSPORTE_PERSONAL = 'transporte_personal';

    /**
     * Semilla fija usada por migraciones y fallback.
     *
     * @return array<string, array{slug: string, title: string, activity: string, short: string}>
     */
    public static function defaults(): array
    {
        return [
            self::SST => [
                'slug' => self::SST,
                'title' => 'Inducción: Seguridad y salud en el trabajo',
                'activity' => 'induccion',
                'short' => 'SST',
            ],
            self::MANEJO_DEFENSIVA => [
                'slug' => self::MANEJO_DEFENSIVA,
                'title' => 'Capacitación: Manejo a la defensiva',
                'activity' => 'capacitacion',
                'short' => 'Manejo defensiva',
            ],
            self::USO_EXTINTORES => [
                'slug' => self::USO_EXTINTORES,
                'title' => 'Capacitación: Uso de extintores',
                'activity' => 'capacitacion',
                'short' => 'Extintores',
            ],
            self::TRANSPORTE_PERSONAL => [
                'slug' => self::TRANSPORTE_PERSONAL,
                'title' => 'Capacitación: Manejo defensivo y transporte de personal',
                'activity' => 'capacitacion',
                'short' => 'Transporte personal',
            ],
        ];
    }

    /**
     * @return array<string, array{slug: string, title: string, activity: string, short: string}>
     */
    public static function all(): array
    {
        if (! self::tableReady()) {
            return self::defaults();
        }

        $types = InductionType::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['slug', 'title', 'activity', 'short']);

        if ($types->isEmpty()) {
            return self::defaults();
        }

        return $types
            ->mapWithKeys(fn (InductionType $type) => [
                $type->slug => [
                    'slug' => $type->slug,
                    'title' => $type->title,
                    'activity' => $type->activity,
                    'short' => $type->short ?: InductionType::makeShort($type->title),
                ],
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::all());
    }

    public static function exists(string $slug): bool
    {
        return isset(self::all()[$slug]);
    }

    /**
     * @return array{slug: string, title: string, activity: string, short: string}|null
     */
    public static function get(string $slug): ?array
    {
        return self::all()[$slug] ?? null;
    }

    public static function title(string $slug): string
    {
        return self::get($slug)['title'] ?? $slug;
    }

    public static function activity(string $slug): string
    {
        return self::get($slug)['activity'] ?? 'capacitacion';
    }

    public static function excelLabel(string $slug): string
    {
        return mb_strtoupper(self::title($slug));
    }

    /**
     * Asigna un tipo a partir del título libre histórico (typos, mayúsculas, etc.).
     */
    public static function resolveFromTitle(?string $title): ?string
    {
        $normalized = self::normalize((string) $title);

        if ($normalized === '') {
            return null;
        }

        foreach (self::all() as $slug => $type) {
            if (self::normalize($type['title']) === $normalized) {
                return $slug;
            }
        }

        if (str_contains($normalized, 'extintor')) {
            return self::USO_EXTINTORES;
        }

        if (
            (str_contains($normalized, 'transporte') && str_contains($normalized, 'personal'))
            || (str_contains($normalized, 'manejo defensivo') && str_contains($normalized, 'transporte'))
            || str_contains($normalized, 'transporte de personal')
        ) {
            return self::TRANSPORTE_PERSONAL;
        }

        if (
            str_contains($normalized, 'manejo') && str_contains($normalized, 'defensiv')
        ) {
            return self::MANEJO_DEFENSIVA;
        }

        if (
            (str_contains($normalized, 'seguridad') && str_contains($normalized, 'salud'))
            || str_contains($normalized, 'sst')
        ) {
            return self::SST;
        }

        return null;
    }

    public static function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = strtr($value, [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ü' => 'u', 'ñ' => 'n',
        ]);
        $value = preg_replace('/[^a-z0-9\s]+/u', ' ', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * @return list<array{value: string, label: string, activity: string, short: string}>
     */
    public static function options(): array
    {
        return collect(self::all())
            ->map(fn (array $type) => [
                'value' => $type['slug'],
                'label' => $type['title'],
                'activity' => $type['activity'],
                'short' => $type['short'],
            ])
            ->values()
            ->all();
    }

    private static function tableReady(): bool
    {
        try {
            return Schema::hasTable('induction_types');
        } catch (\Throwable) {
            return false;
        }
    }
}
