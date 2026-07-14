<?php

namespace App\Support;

final class UnitDocumentTypes
{
    public const DRIVER_LICENSE = 'driver_license';

    public const DRIVER_DNI = 'driver_dni';

    public const SOAT = 'soat';

    public const TECHNICAL_INSPECTION = 'technical_inspection';

    public const OWNERSHIP_CARD = 'ownership_card';

    public const CIRCULATION_PERMIT = 'circulation_permit';

    public const OTHER = 'other';

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return [
            self::DRIVER_LICENSE,
            self::DRIVER_DNI,
            self::SOAT,
            self::TECHNICAL_INSPECTION,
            self::OWNERSHIP_CARD,
            self::CIRCULATION_PERMIT,
            self::OTHER,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::DRIVER_LICENSE => 'Licencia de conducir',
            self::DRIVER_DNI => 'DNI del conductor',
            self::SOAT => 'SOAT',
            self::TECHNICAL_INSPECTION => 'Revisión técnica',
            self::OWNERSHIP_CARD => 'Tarjeta de propiedad',
            self::CIRCULATION_PERMIT => 'Permiso de circulación',
            self::OTHER => 'Otro',
        ];
    }

    public static function label(string $type): string
    {
        return self::labels()[$type] ?? $type;
    }
}
