<?php

namespace App\Support;

use App\Models\LicenseCategory;
use App\Models\ResponsiblePerson;
use App\Models\ServiceType;
use App\Models\VehicleType;

class UnitCatalog
{
    /**
     * @return list<string>
     */
    public static function vehicleTypes(): array
    {
        return [
            'BUS',
            'BUS 2',
            'CAMIONETA',
            'COMBI',
            'CUSTER',
            'JOYLONG',
            'MINIBUS',
            'MINIVAN',
        ];
    }

    /**
     * Categorías vigentes del brevete en Perú (MTC).
     *
     * @return list<array{name: string, description: string, sort: int}>
     */
    public static function licenseCategories(): array
    {
        return [
            ['name' => 'A-I', 'description' => 'Autos particulares', 'sort' => 10],
            ['name' => 'A-IIa', 'description' => 'Taxi, ambulancias y transporte de pasajeros', 'sort' => 20],
            ['name' => 'A-IIb', 'description' => 'Microbús, minibús y camionetas de carga', 'sort' => 30],
            ['name' => 'A-IIIa', 'description' => 'Ómnibus urbano e interurbano', 'sort' => 40],
            ['name' => 'A-IIIb', 'description' => 'Camiones, volquetes, grúas y remolques', 'sort' => 50],
            ['name' => 'A-IIIc', 'description' => 'Vehículos articulados', 'sort' => 60],
            ['name' => 'B-I', 'description' => 'Triciclos no motorizados', 'sort' => 70],
            ['name' => 'B-IIa', 'description' => 'Bicimotos', 'sort' => 80],
            ['name' => 'B-IIb', 'description' => 'Motocicletas', 'sort' => 90],
            ['name' => 'B-IIc', 'description' => 'Mototaxis y trimotos', 'sort' => 100],
        ];
    }

    public static function seedDefaults(): void
    {
        foreach (self::vehicleTypes() as $index => $name) {
            VehicleType::query()->firstOrCreate(
                ['name' => $name],
                ['sort' => ($index + 1) * 10],
            );
        }

        foreach (self::licenseCategories() as $category) {
            LicenseCategory::query()->firstOrCreate(
                ['name' => $category['name']],
                [
                    'description' => $category['description'],
                    'sort' => $category['sort'],
                ],
            );
        }
    }

    public static function rememberVehicleType(?string $name): ?VehicleType
    {
        $normalized = self::normalizeVehicleType($name);

        if ($normalized === null) {
            return null;
        }

        $existing = VehicleType::query()
            ->whereRaw('upper(name) = ?', [$normalized])
            ->first();

        if ($existing) {
            return $existing;
        }

        $sort = ((int) VehicleType::query()->max('sort')) + 10;

        return VehicleType::query()->create([
            'name' => $normalized,
            'sort' => $sort,
        ]);
    }

    public static function rememberLicenseCategory(?string $name): ?LicenseCategory
    {
        $trimmed = self::normalizeLabel($name);

        if ($trimmed === null) {
            return null;
        }

        $existing = LicenseCategory::query()
            ->whereRaw('lower(name) = ?', [mb_strtolower($trimmed)])
            ->first();

        if ($existing) {
            return $existing;
        }

        $sort = ((int) LicenseCategory::query()->max('sort')) + 10;

        return LicenseCategory::query()->create([
            'name' => $trimmed,
            'sort' => $sort,
        ]);
    }

    public static function rememberServiceType(?string $name): ?ServiceType
    {
        return self::rememberUpperName(ServiceType::class, $name);
    }

    public static function rememberResponsiblePerson(?string $name): ?ResponsiblePerson
    {
        return self::rememberUpperName(ResponsiblePerson::class, $name);
    }

    public static function formatPlate(?string $plate): ?string
    {
        $raw = trim((string) $plate);

        if ($raw === '') {
            return null;
        }

        $body = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $raw));

        if (strlen($body) === 6) {
            return substr($body, 0, 3).'-'.substr($body, 3);
        }

        return $body;
    }

    /**
     * @param  class-string<ServiceType|ResponsiblePerson>  $model
     */
    private static function rememberUpperName(string $model, ?string $name): ServiceType|ResponsiblePerson|null
    {
        $normalized = self::normalizeVehicleType($name);

        if ($normalized === null) {
            return null;
        }

        $existing = $model::query()
            ->whereRaw('upper(name) = ?', [$normalized])
            ->first();

        if ($existing) {
            return $existing;
        }

        $sort = ((int) $model::query()->max('sort')) + 10;

        return $model::query()->create([
            'name' => $normalized,
            'sort' => $sort,
        ]);
    }

    public static function normalizeVehicleType(?string $name): ?string
    {
        $label = self::normalizeLabel($name);

        if ($label === null) {
            return null;
        }

        return mb_strtoupper($label);
    }

    private static function normalizeLabel(?string $name): ?string
    {
        $label = trim((string) preg_replace('/\s+/u', ' ', (string) $name));

        return $label === '' ? null : $label;
    }
}
