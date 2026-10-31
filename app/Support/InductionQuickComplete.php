<?php

namespace App\Support;

use App\Models\DriverBiometric;
use App\Models\InductionAttendee;
use App\Models\Unit;
use Illuminate\Support\Collection;

final class InductionQuickComplete
{
    /**
     * Conductores con firma+huella que aún no tienen el tipo (vigencia 1 año).
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

        $biometrics = DriverBiometric::query()
            ->whereNotNull('signature_path')
            ->where('signature_path', '!=', '')
            ->whereNotNull('fingerprint_path')
            ->where('fingerprint_path', '!=', '')
            ->orderByDesc('id')
            ->get();

        if ($biometrics->isEmpty()) {
            return [];
        }

        $covered = self::coveredDnis($typeSlug);
        $units = self::unitsByDni(
            $biometrics->pluck('dni')->filter()->map(fn ($dni) => (string) $dni)->unique()->values()->all(),
        );

        $rows = [];
        $seen = [];

        foreach ($biometrics as $bio) {
            $dni = DriverBiometrics::digits($bio->dni);

            if ($dni === '' || isset($seen[$dni]) || isset($covered[$dni])) {
                continue;
            }

            $unit = $units->get($dni);
            $name = trim((string) ($unit?->driver_name ?: $bio->driver_name ?: ''));

            if ($name === '') {
                continue;
            }

            $seen[$dni] = true;
            $rows[] = [
                'key' => $dni,
                'dni' => $dni,
                'name' => $name,
                'plate' => $unit?->plate_number,
                'provider' => $unit?->provider,
                'unit_id' => $unit?->id,
                'biometric_id' => $bio->id,
            ];
        }

        usort($rows, fn (array $left, array $right) => strcmp($left['name'], $right['name']));

        return $rows;
    }

    /**
     * DNIs que ya tienen el tipo en el último año (inscritos o asistieron).
     *
     * @return array<string, true>
     */
    public static function coveredDnis(string $typeSlug): array
    {
        $cutoff = now()->subYear()->startOfDay()->toDateString();

        $attendees = InductionAttendee::query()
            ->whereIn('status', [
                InductionAttendeeStatuses::REGISTERED,
                InductionAttendeeStatuses::ATTENDED,
            ])
            ->whereHas('induction', function ($query) use ($typeSlug, $cutoff): void {
                $query
                    ->where('induction_type', $typeSlug)
                    ->where('status', '!=', InductionStatuses::CANCELLED)
                    ->where(function ($dates) use ($cutoff): void {
                        $dates->whereDate('session_date', '>=', $cutoff)
                            ->orWhere(function ($fallback) use ($cutoff): void {
                                $fallback->whereNull('session_date')
                                    ->whereDate('scheduled_at', '>=', $cutoff);
                            })
                            ->orWhere(function ($created) use ($cutoff): void {
                                $created->whereNull('session_date')
                                    ->whereNull('scheduled_at')
                                    ->whereDate('created_at', '>=', $cutoff);
                            });
                    });
            })
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

    /**
     * @param  list<string>  $dnis
     * @return Collection<string, Unit>
     */
    private static function unitsByDni(array $dnis): Collection
    {
        if ($dnis === []) {
            return collect();
        }

        $placeholders = implode(', ', array_fill(0, count($dnis), '?'));

        return Unit::query()
            ->whereNotNull('driver_dni')
            ->where(function ($query): void {
                $query->where('status', 'active')->orWhereNull('status');
            })
            ->whereRaw(
                "regexp_replace(coalesce(driver_dni, ''), '[^0-9]', '', 'g') in ({$placeholders})",
                $dnis,
            )
            ->orderByDesc('id')
            ->get(['id', 'driver_name', 'driver_dni', 'plate_number', 'provider', 'status'])
            ->unique(fn (Unit $unit) => DriverBiometrics::digits($unit->driver_dni))
            ->keyBy(fn (Unit $unit) => DriverBiometrics::digits($unit->driver_dni));
    }
}
