<?php

namespace App\Support;

use App\Models\DriverBiometric;
use App\Models\InductionAttendee;
use App\Models\UnitChecklistSignature;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

final class DriverBiometrics
{
    /** @var array<string, DriverBiometric|null> */
    private static array $cache = [];

    public static function remember(?string $dni, ?string $name, ?string $signaturePath, ?string $fingerprintPath): ?DriverBiometric
    {
        self::ensure();
        $digits = self::digits($dni);
        $nameKey = self::normalize($name);

        if ($digits === '' && $nameKey === '') {
            return null;
        }

        if (($signaturePath === null || $signaturePath === '') && ($fingerprintPath === null || $fingerprintPath === '')) {
            return self::find($dni, $name);
        }

        $row = self::row($digits, $nameKey, $name);
        $disk = Storage::disk('public');
        $folder = 'drivers/biometrics/'.($digits !== '' ? 'dni-'.$digits : 'name-'.substr(sha1($nameKey), 0, 16));

        if ($signaturePath && $disk->exists($signaturePath)) {
            $row->signature_path = self::copyInto($signaturePath, $folder, 'signature', $row->signature_path);
        }

        if ($fingerprintPath && $disk->exists($fingerprintPath)) {
            $row->fingerprint_path = self::copyInto($fingerprintPath, $folder, 'fingerprint', $row->fingerprint_path);
        }

        if ($nameKey !== '') {
            $row->name_key = $nameKey;
        }

        if (trim((string) $name) !== '') {
            $row->driver_name = trim((string) $name);
        }

        $row->save();
        self::$cache[self::cacheKey($digits, $nameKey)] = $row;

        return $row;
    }

    public static function find(?string $dni, ?string $name): ?DriverBiometric
    {
        $digits = self::digits($dni);
        $nameKey = self::normalize($name);
        $cacheKey = self::cacheKey($digits, $nameKey);

        if ($cacheKey === '') {
            return null;
        }

        self::ensure();

        if (array_key_exists($cacheKey, self::$cache)) {
            return self::$cache[$cacheKey];
        }

        $row = self::locate($digits, $nameKey);

        if ($row && ($row->signature_path || $row->fingerprint_path)) {
            return self::$cache[$cacheKey] = $row;
        }

        $historical = self::historical($digits, $nameKey);

        if ($historical === null) {
            return self::$cache[$cacheKey] = $row;
        }

        return self::remember($dni, $name, $historical['signature'], $historical['fingerprint']);
    }

    public static function copyFile(?string $source, string $directory): ?string
    {
        if ($source === null || $source === '' || ! Storage::disk('public')->exists($source)) {
            return null;
        }

        $extension = pathinfo($source, PATHINFO_EXTENSION) ?: 'png';
        $path = trim($directory, '/').'/'.uniqid('firma_', true).'.'.$extension;
        Storage::disk('public')->copy($source, $path);

        return $path;
    }

    private static function row(string $digits, string $nameKey, ?string $name): DriverBiometric
    {
        if ($digits !== '') {
            $row = DriverBiometric::query()->where('dni', $digits)->first();

            if ($row) {
                return $row;
            }

            $byName = $nameKey !== ''
                ? DriverBiometric::query()->where('name_key', $nameKey)->whereNull('dni')->first()
                : null;

            if ($byName) {
                $byName->dni = $digits;

                return $byName;
            }

            return new DriverBiometric([
                'dni' => $digits,
                'name_key' => $nameKey !== '' ? $nameKey : null,
                'driver_name' => trim((string) $name) !== '' ? trim((string) $name) : null,
            ]);
        }

        $row = DriverBiometric::query()->where('name_key', $nameKey)->orderByDesc('updated_at')->first();

        return $row ?? new DriverBiometric([
            'name_key' => $nameKey,
            'driver_name' => trim((string) $name) !== '' ? trim((string) $name) : null,
        ]);
    }

    private static function locate(string $digits, string $nameKey): ?DriverBiometric
    {
        if ($digits !== '') {
            $byDni = DriverBiometric::query()->where('dni', $digits)->first();

            if ($byDni) {
                return $byDni;
            }
        }

        if ($nameKey === '') {
            return null;
        }

        return DriverBiometric::query()->where('name_key', $nameKey)->orderByDesc('updated_at')->first();
    }

    /**
     * @return array{signature: string|null, fingerprint: string|null}|null
     */
    private static function historical(string $digits, string $nameKey): ?array
    {
        $attendee = self::historicalAttendee($digits, $nameKey);
        $inspection = self::historicalInspection($digits, $nameKey);
        $signature = $attendee?->signature_path ?: $inspection?->signature_path;
        $fingerprint = $attendee?->fingerprint_path;

        if (! $signature && ! $fingerprint) {
            return null;
        }

        return [
            'signature' => $signature,
            'fingerprint' => $fingerprint,
        ];
    }

    private static function historicalAttendee(string $digits, string $nameKey): ?InductionAttendee
    {
        $query = InductionAttendee::query()
            ->where(function ($builder) {
                $builder
                    ->where(fn ($inner) => $inner->whereNotNull('signature_path')->where('signature_path', '!=', ''))
                    ->orWhere(fn ($inner) => $inner->whereNotNull('fingerprint_path')->where('fingerprint_path', '!=', ''));
            });

        self::matchPerson(
            $query,
            'driver_dni',
            'driver_name',
            $digits,
            $digits !== '' ? '' : $nameKey,
        );

        return $query->orderByDesc('signed_at')->orderByDesc('id')->first();
    }

    private static function historicalInspection(string $digits, string $nameKey): ?UnitChecklistSignature
    {
        $query = UnitChecklistSignature::query()
            ->where('slot', 'driver')
            ->whereNotNull('signature_path')
            ->where('signature_path', '!=', '')
            ->whereHas('checklist', function ($checklist) use ($digits, $nameKey) {
                $checklist->where(function ($people) use ($digits, $nameKey) {
                    if ($digits !== '') {
                        $people->whereHas('unit', function ($unit) use ($digits) {
                            self::matchPerson($unit, 'driver_dni', 'driver_name', $digits, '');
                        });

                        return;
                    }

                    self::matchPerson($people, 'driver_name', 'driver_name', '', $nameKey);
                    $people->orWhereHas('unit', function ($unit) use ($nameKey) {
                        self::matchPerson($unit, 'driver_dni', 'driver_name', '', $nameKey);
                    });
                });
            });

        return $query->orderByDesc('signed_at')->orderByDesc('id')->first();
    }

    private static function matchPerson($query, string $dniColumn, string $nameColumn, string $digits, string $nameKey): void
    {
        $query->where(function ($builder) use ($dniColumn, $nameColumn, $digits, $nameKey) {
            $matched = false;

            if ($digits !== '' && $dniColumn !== $nameColumn) {
                $builder->whereRaw(
                    "regexp_replace(coalesce({$dniColumn}, ''), '\\D', '', 'g') = ?",
                    [$digits],
                );
                $matched = true;
            }

            if ($nameKey !== '') {
                $expression = "translate(lower(trim(coalesce({$nameColumn}, ''))), 'áéíóúüñ', 'aeiouun') = ?";

                if ($matched) {
                    $builder->orWhereRaw($expression, [$nameKey]);
                } else {
                    $builder->whereRaw($expression, [$nameKey]);
                }
            }

            if (! $matched && $nameKey === '') {
                $builder->whereRaw('1 = 0');
            }
        });
    }

    private static function copyInto(string $source, string $folder, string $name, ?string $previous): string
    {
        $disk = Storage::disk('public');
        $extension = pathinfo($source, PATHINFO_EXTENSION) ?: 'png';
        $path = $folder.'/'.$name.'.'.$extension;

        if ($previous && $previous !== $path && $previous !== $source) {
            $disk->delete($previous);
        }

        if ($source !== $path) {
            $disk->copy($source, $path);
        }

        return $path;
    }

    private static function cacheKey(string $digits, string $nameKey): string
    {
        if ($digits !== '') {
            return 'dni:'.$digits;
        }

        return $nameKey === '' ? '' : 'name:'.$nameKey;
    }

    public static function digits(?string $dni): string
    {
        return preg_replace('/\D+/', '', (string) $dni) ?? '';
    }

    private static function ensure(): void
    {
        if (Schema::hasTable('driver_biometrics')) {
            return;
        }

        Schema::create('driver_biometrics', function (Blueprint $table) {
            $table->id();
            $table->string('dni', 20)->nullable();
            $table->string('name_key', 160)->nullable();
            $table->string('driver_name')->nullable();
            $table->string('signature_path')->nullable();
            $table->string('fingerprint_path')->nullable();
            $table->timestamps();
            $table->unique('dni');
            $table->index('name_key');
        });
    }

    public static function normalize(?string $value): string
    {
        $value = mb_strtolower(trim((string) $value));
        $value = strtr($value, [
            'á' => 'a',
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ú' => 'u',
            'ü' => 'u',
            'ñ' => 'n',
        ]);

        return preg_replace('/\s+/', ' ', $value) ?? '';
    }
}
