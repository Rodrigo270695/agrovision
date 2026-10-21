<?php

namespace App\Support;

use App\Models\User;

final class CoordinatorSede
{
    /** @var array<int, string> */
    private static array $cache = [];

    public static function forCoordinatorId(?int $coordinatorId): string
    {
        if ($coordinatorId === null) {
            return '';
        }

        if (! array_key_exists($coordinatorId, self::$cache)) {
            $user = User::query()
                ->with(['places.site'])
                ->find($coordinatorId);

            $place = $user?->places->first();
            self::$cache[$coordinatorId] = trim((string) ($place?->site?->name ?? ''));
        }

        return self::$cache[$coordinatorId];
    }

    public static function flushCache(): void
    {
        self::$cache = [];
    }
}
