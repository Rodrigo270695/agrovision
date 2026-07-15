<?php

namespace App\Support;

final class UnitDocumentTypes
{
    public const DRIVER_LICENSE = 'driver_license';

    public const DRIVER_DNI = 'driver_dni';

    public const SOAT = 'soat';

    public const TECHNICAL_INSPECTION = 'technical_inspection';

    public const OWNERSHIP_CARD = 'ownership_card';

    public const SCTR = 'sctr';

    public const OTHER = 'other';

    /**
     * Tipos seleccionables al subir (incluye opcional «Otro»).
     *
     * @return list<string>
     */
    public static function keys(): array
    {
        return [
            ...self::requiredKeys(),
            self::OTHER,
        ];
    }

    /**
     * Los 6 documentos obligatorios que cuentan para el avance.
     *
     * @return list<string>
     */
    public static function requiredKeys(): array
    {
        return [
            self::DRIVER_LICENSE,
            self::DRIVER_DNI,
            self::SOAT,
            self::TECHNICAL_INSPECTION,
            self::OWNERSHIP_CARD,
            self::SCTR,
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
            self::SCTR => 'SCTR',
            self::OTHER => 'Otro',
        ];
    }

    public static function label(string $type): string
    {
        return self::labels()[$type] ?? $type;
    }

    /**
     * @param  iterable<int, object|array<string, mixed>>  $documents
     * @return array{
     *     done: int,
     *     total: int,
     *     percent: int,
     *     types: list<array{value: string, label: string, uploaded: bool}>
     * }
     */
    public static function progress(iterable $documents): array
    {
        $uploaded = [];

        foreach ($documents as $document) {
            $type = is_array($document)
                ? (string) ($document['type'] ?? '')
                : (string) ($document->type ?? '');

            if ($type !== '') {
                $uploaded[$type] = true;
            }
        }

        // Compatibilidad con registros antiguos
        if (isset($uploaded['circulation_permit'])) {
            $uploaded[self::SCTR] = true;
        }

        $required = self::requiredKeys();
        $types = [];
        $done = 0;

        foreach ($required as $key) {
            $isUploaded = isset($uploaded[$key]);
            if ($isUploaded) {
                $done++;
            }

            $types[] = [
                'value' => $key,
                'label' => self::label($key),
                'uploaded' => $isUploaded,
            ];
        }

        $total = count($required);

        return [
            'done' => $done,
            'total' => $total,
            'percent' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
            'types' => $types,
        ];
    }
}
