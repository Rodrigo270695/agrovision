<?php

namespace App\Support;

final class ParetoCheckTypes
{
    public const OBSERVATION = 'observation';

    public const EXPIRY = 'expiry';

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return [
            self::OBSERVATION,
            self::EXPIRY,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::OBSERVATION => 'Observación',
            self::EXPIRY => 'Vencimiento / observación',
        ];
    }

    public static function label(string $type): string
    {
        return self::labels()[$type] ?? $type;
    }

    public static function fromHasExpiry(bool $hasExpiry): string
    {
        return $hasExpiry ? self::EXPIRY : self::OBSERVATION;
    }
}
