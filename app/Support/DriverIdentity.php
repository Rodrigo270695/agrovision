<?php

namespace App\Support;

final class DriverIdentity
{
    public static function key(?string $dni, ?string $name): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $dni) ?: '';

        if ($digits !== '') {
            return 'd:'.$digits;
        }

        $normalized = mb_strtoupper(trim((string) $name));

        return $normalized !== '' ? 'n:'.$normalized : null;
    }
}
