<?php

namespace App\Support;

use App\Models\Driver;
use App\Models\DriverBiometric;
use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Unit;
use Illuminate\Support\Collection;

final class InductionQuickComplete
{
    /**
     * Solo activos + firma/huella + sin ese tipo (como el Excel de faltantes).
     *
     * @return list<array{
     *   key: string,
     *   dni: string,
     *   name: string,
     *   plate: string|null,
     *   provider: string|null,
     *   unit_id: int|null,
     *   biometric_id: int
     * }>
     */
    public static function candidates(string $typeSlug): array
    {
        if (! InductionTypeCatalog::exists($typeSlug)) {
            return [];
        }

        $activeUnits = self::activeUnitsByDni();

        if ($activeUnits->isEmpty()) {
            return [];
        }

        $covered = self::coveredDnis($typeSlug);
        $biometrics = self::biometricsByDni($activeUnits->keys()->all());

        $rows = [];

        foreach ($activeUnits as $dni => $unit) {
            if (isset($covered[$dni])) {
                continue;
            }

            $bio = $biometrics->get($dni);

            if ($bio === null) {
                continue;
            }

            $name = trim((string) $unit->driver_name);

            if ($name === '') {
                continue;
            }

            $rows[] = [
                'key' => $dni,
                'dni' => $dni,
                'name' => $name,
                'plate' => $unit->plate_number,
                'provider' => $unit->provider,
                'unit_id' => $unit->id,
                'biometric_id' => $bio->id,
            ];
        }

        usort($rows, fn (array $left, array $right) => strcmp($left['name'], $right['name']));

        return $rows;
    }

    /**
     * Última unidad activa por DNI (periodo activo y no inactive).
     *
     * @return Collection<string, Unit>
     */
    private static function activeUnitsByDni(): Collection
    {
        $units = Unit::query()
            ->with(['period:id,status'])
            ->whereNotNull('driver_dni')
            ->where('driver_dni', '!=', '')
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '')
            ->where(function ($query): void {
                $query->whereNull('status')->orWhere('status', '!=', 'inactive');
            })
            ->whereHas('period', fn ($period) => $period->where('status', 'active'))
            ->orderByDesc('id')
            ->get([
                'id',
                'period_id',
                'driver_name',
                'driver_dni',
                'plate_number',
                'provider',
                'status',
            ]);

        if ($units->isEmpty()) {
            return collect();
        }

        $catalog = self::driverCatalog($units);
        $byDni = collect();

        foreach ($units as $unit) {
            $dni = DriverBiometrics::digits($unit->driver_dni);

            if ($dni === '' || $byDni->has($dni)) {
                continue;
            }

            if (! self::isActiveUnit($unit, $catalog)) {
                continue;
            }

            $byDni->put($dni, $unit);
        }

        return $byDni;
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return Collection<string, Driver>
     */
    private static function driverCatalog(Collection $units): Collection
    {
        $periodIds = $units->pluck('period_id')->unique()->filter()->values()->all();

        if ($periodIds === []) {
            return collect();
        }

        return Driver::query()
            ->whereIn('period_id', $periodIds)
            ->get()
            ->keyBy(fn (Driver $driver): string => $driver->period_id.'|'.$driver->identity_key);
    }

    /**
     * @param  Collection<string, Driver>  $catalog
     */
    private static function isActiveUnit(Unit $unit, Collection $catalog): bool
    {
        if ((string) $unit->status === 'inactive') {
            return false;
        }

        $identity = DriverIdentity::key($unit->driver_dni, $unit->driver_name);
        $record = $identity
            ? $catalog->get($unit->period_id.'|'.$identity)
            : null;

        if ($record !== null) {
            return $record->status === 'active';
        }

        return $unit->period?->status === 'active';
    }

    /**
     * @param  list<string>  $dnis
     * @return Collection<string, DriverBiometric>
     */
    private static function biometricsByDni(array $dnis): Collection
    {
        if ($dnis === []) {
            return collect();
        }

        return DriverBiometric::query()
            ->whereIn('dni', $dnis)
            ->whereNotNull('signature_path')
            ->where('signature_path', '!=', '')
            ->whereNotNull('fingerprint_path')
            ->where('fingerprint_path', '!=', '')
            ->orderByDesc('id')
            ->get()
            ->unique(fn (DriverBiometric $bio) => DriverBiometrics::digits($bio->dni))
            ->keyBy(fn (DriverBiometric $bio) => DriverBiometrics::digits($bio->dni));
    }

    /**
     * DNIs que ya tienen el tipo (inscritos o asistieron), por slug o título histórico.
     *
     * @return array<string, true>
     */
    public static function coveredDnis(string $typeSlug): array
    {
        $inductionIds = Induction::query()
            ->where('status', '!=', InductionStatuses::CANCELLED)
            ->where('induction_type', $typeSlug)
            ->pluck('id');

        $legacy = Induction::query()
            ->where('status', '!=', InductionStatuses::CANCELLED)
            ->where(function ($query): void {
                $query->whereNull('induction_type')->orWhere('induction_type', '');
            })
            ->get(['id', 'title']);

        foreach ($legacy as $induction) {
            if (InductionTypeCatalog::resolveFromTitle((string) $induction->title) === $typeSlug) {
                $inductionIds->push($induction->id);
            }
        }

        $inductionIds = $inductionIds->unique()->values();

        if ($inductionIds->isEmpty()) {
            return [];
        }

        $attendees = InductionAttendee::query()
            ->whereIn('induction_id', $inductionIds)
            ->whereIn('status', [
                InductionAttendeeStatuses::REGISTERED,
                InductionAttendeeStatuses::ATTENDED,
            ])
            ->get(['driver_dni']);

        $covered = [];

        foreach ($attendees as $attendee) {
            $dni = DriverBiometrics::digits($attendee->driver_dni);

            if ($dni !== '') {
                $covered[$dni] = true;
            }
        }

        return $covered;
    }
}
