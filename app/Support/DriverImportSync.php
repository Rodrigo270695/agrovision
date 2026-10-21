<?php

namespace App\Support;

use App\Models\Driver;
use App\Models\DriverMovement;
use App\Models\Period;
use App\Models\UnitMovement;
use Illuminate\Support\Facades\Auth;

/**
 * Sincroniza el catálogo de conductores y su histórico diario a partir del Excel de unidades.
 */
final class DriverImportSync
{
    /**
     * @var array<string, array{driver_id: int, service_date: string, data: array<string, mixed>}>
     */
    private array $latestByDriver = [];

    /**
     * @param  array<string, mixed>  $data
     */
    public function recordRow(Period $period, int $unitId, UnitMovement $movement, array $data): void
    {
        $name = trim((string) ($data['driver_name'] ?? ''));
        $dni = trim((string) ($data['driver_dni'] ?? ''));

        if ($name === '' && $dni === '') {
            return;
        }

        $identityKey = DriverIdentity::key($dni, $name);

        if ($identityKey === null) {
            return;
        }

        $coordinatorId = isset($data['coordinator_id']) ? (int) $data['coordinator_id'] : null;
        $sede = UnitSede::label($data['route'] ?? null, null, $coordinatorId);

        $driver = Driver::query()->firstOrCreate(
            [
                'period_id' => $period->id,
                'identity_key' => $identityKey,
            ],
            [
                'driver_dni' => $dni !== '' ? $dni : null,
                'driver_name' => $name !== '' ? $name : $dni,
                'status' => 'active',
            ],
        );

        if ($dni !== '' && $driver->driver_dni === null) {
            $driver->driver_dni = $dni;
        }

        if ($name !== '' && trim((string) $driver->driver_name) === '') {
            $driver->driver_name = $name;
        }

        $driver->save();

        DriverMovement::query()->updateOrCreate(
            ['unit_movement_id' => $movement->id],
            [
                'driver_id' => $driver->id,
                'period_id' => $period->id,
                'unit_id' => $unitId,
                'service_date' => $data['service_date'],
                'correlative' => $movement->correlative,
                'plate_number' => $movement->plate_number,
                'provider' => $movement->provider,
                'coordinator_id' => $coordinatorId,
                'sede' => $sede !== '' ? $sede : null,
                'driver_name' => $name !== '' ? $name : null,
                'driver_dni' => $dni !== '' ? $dni : null,
            ],
        );

        $serviceDate = (string) ($data['service_date'] ?? '');
        $existing = $this->latestByDriver[$identityKey] ?? null;

        if ($existing === null || $serviceDate >= $existing['service_date']) {
            $this->latestByDriver[$identityKey] = [
                'driver_id' => $driver->id,
                'service_date' => $serviceDate,
                'data' => [
                    'driver_dni' => $dni !== '' ? $dni : $driver->driver_dni,
                    'driver_name' => $name !== '' ? $name : $driver->driver_name,
                    'coordinator_id' => $coordinatorId,
                    'sede' => $sede !== '' ? $sede : null,
                    'provider' => $data['provider'] ?? null,
                    'plate_number' => $data['plate_number'] ?? $movement->plate_number,
                    'unit_id' => $unitId,
                    'service_date' => $data['service_date'] ?? null,
                ],
            ];
        }
    }

    public function syncPresence(Period $period): void
    {
        foreach ($this->latestByDriver as $latest) {
            $driverId = $latest['driver_id'];
            $data = $latest['data'];
            $previous = Driver::query()->whereKey($driverId)->value('status') ?: 'active';

            Driver::query()->whereKey($driverId)->update([
                ...$data,
                'status' => 'active',
            ]);

            if ($previous !== 'active') {
                DriverStatusHistory::record(
                    $driverId,
                    'active',
                    $data['service_date'] ?? now(),
                    'import',
                );
            }
        }

        $presentIds = array_values(array_map(
            fn (array $latest): int => $latest['driver_id'],
            $this->latestByDriver,
        ));

        if ($presentIds === []) {
            return;
        }

        $missing = Driver::query()
            ->where('period_id', $period->id)
            ->whereNotIn('id', $presentIds);

        if (SystemRoles::currentIsScopedCoordinator()) {
            $missing->where('coordinator_id', Auth::id());
        }

        $returning = (clone $missing)->where(function ($query): void {
            $query->where('status', '!=', 'inactive')->orWhereNull('status');
        })->pluck('id');

        $missing->update(['status' => 'inactive']);

        $today = now()->toDateString();

        foreach ($returning as $driverId) {
            DriverStatusHistory::record((int) $driverId, 'inactive', $today, 'import');
        }
    }
}
