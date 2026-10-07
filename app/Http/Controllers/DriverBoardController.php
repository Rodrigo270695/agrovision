<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Site;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitDocument;
use App\Models\User;
use App\Support\InductionFormOptions;
use App\Support\ReportPeriod;
use App\Support\SystemRoles;
use App\Support\UnitDocumentTypes;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DriverBoardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'coordinator_id' => ['nullable', 'integer'],
            'inspector_id' => ['nullable', 'integer'],
            'sede' => ['nullable', 'integer'],
        ]);

        $range = ReportPeriod::range($validated['date_from'] ?? null, $validated['date_to'] ?? null);
        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;
        $inspectorId = isset($validated['inspector_id'])
            ? (int) $validated['inspector_id']
            : null;
        $siteId = isset($validated['sede']) ? (int) $validated['sede'] : null;

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        $drivers = $this->drivers($coordinatorId, $siteId);
        $sessions = $this->sessions($range, $inspectorId);
        $items = $this->items($drivers, $sessions, $range, $inspectorId);

        $coordinatorNames = $drivers
            ->pluck('coordinator')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return Inertia::render('driver-board/index', [
            'items' => $items,
            'summary' => [
                'drivers' => $drivers->count(),
                'week_label' => $range['label'],
                'coordinators' => $coordinatorNames,
            ],
            'filters' => [
                'date_from' => $range['from'],
                'date_to' => $range['to'],
                'coordinator_id' => $coordinatorId,
                'inspector_id' => $inspectorId,
                'sede' => $siteId,
            ],
            'coordinators' => $this->coordinatorOptions($coordinatorId),
            'inspectors' => $this->inspectorOptions(),
            'sedes' => $this->sedeOptions(),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    /**
     * @return Collection<string, array{license: string, coordinator: string|null}>
     */
    private function drivers(?int $coordinatorId, ?int $siteId): Collection
    {
        $query = Unit::query()
            ->with([
                'documents' => fn ($builder) => $builder
                    ->where('type', UnitDocumentTypes::DRIVER_LICENSE)
                    ->select(['id', 'unit_id', 'type', 'expires_at']),
                'coordinatorUser:id,name',
            ])
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '');

        if ($siteId) {
            $query->whereIn('coordinator_id', $this->coordinatorIdsForSite($siteId));
        }

        if ($coordinatorId) {
            $query->where('coordinator_id', $coordinatorId);
        }

        /** @var Collection<string, array{license: string, coordinator: string|null, units: list<int>}> $drivers */
        $drivers = collect();

        foreach ($query->get() as $unit) {
            $key = $this->identity($unit->driver_dni, $unit->driver_name);

            if ($key === null) {
                continue;
            }

            $current = $drivers->get($key, [
                'license' => 'baja',
                'coordinator' => null,
                'name' => $this->normalize($unit->driver_name),
                'units' => [],
            ]);
            $current['units'][] = (int) $unit->id;
            $current['license'] = $this->betterLicense(
                $current['license'],
                $this->licenseStatus($unit->documents),
            );
            $current['coordinator'] ??= $unit->coordinatorUser?->name;
            $drivers->put($key, $current);
        }

        return $drivers;
    }

    /**
     * @return Collection<int, Induction>
     */
    private function sessions(array $range, ?int $inspectorId): Collection
    {
        $query = Induction::query()
            ->with([
                'attendees:id,induction_id,unit_id,driver_name,driver_dni,status,signature_path',
            ])
            ->where(function ($builder) {
                $builder
                    ->whereNull('period_id')
                    ->orWhereHas('period', fn ($period) => $period->where('status', 'active'));
            });

        if ($inspectorId) {
            $query->where('created_by', $inspectorId);
        }

        if ($range['from'] !== null && $range['to'] !== null) {
            $query->where(function ($builder) use ($range) {
                $builder
                    ->whereBetween('session_date', [$range['from'], $range['to']])
                    ->orWhere(function ($inner) use ($range) {
                        $inner
                            ->whereNull('session_date')
                            ->whereBetween('scheduled_at', [
                                $range['from'].' 00:00:00',
                                $range['to'].' 23:59:59',
                            ]);
                    });
            });
        }

        return $query->get();
    }

    /**
     * @param  Collection<string, array{license: string, coordinator: string|null, units?: list<int>, name?: string}>  $drivers
     * @param  Collection<int, Induction>  $sessions
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return list<array<string, mixed>>
     */
    private function items(Collection $drivers, Collection $sessions, array $range, ?int $inspectorId): array
    {
        $total = $drivers->count();

        return [
            $this->licenseRing($drivers, $total),
            $this->inspectionRing($drivers, $range, $inspectorId, $total),
            ...$this->inductionRings($sessions, $drivers, $total),
        ];
    }

    /**
     * @param  Collection<string, array{license: string}>  $drivers
     * @return array<string, mixed>
     */
    private function licenseRing(Collection $drivers, int $total): array
    {
        return $this->ring(
            'licencia',
            'Licencia de conducir',
            'documento',
            'status',
            $drivers->where('license', 'ok')->count(),
            $drivers->where('license', 'baja')->count(),
            $drivers->where('license', 'falta')->count(),
            0,
            $total,
        );
    }

    /**
     * @param  Collection<string, array{units?: list<int>}>  $drivers
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return array<string, mixed>
     */
    private function inspectionRing(Collection $drivers, array $range, ?int $inspectorId, int $total): array
    {
        $unitKey = [];

        foreach ($drivers as $key => $driver) {
            foreach ($driver['units'] ?? [] as $unitId) {
                $unitKey[(int) $unitId] = $key;
            }
        }

        $best = [];

        if ($unitKey !== []) {
            $query = UnitChecklist::query()
                ->whereIn('unit_id', array_keys($unitKey))
                ->whereHas('period', fn ($builder) => $builder->where('status', 'active'));

            if ($range['from'] !== null && $range['to'] !== null) {
                $query->whereBetween('first_inspected_on', [$range['from'], $range['to']]);
            }

            if ($inspectorId) {
                $query->where('created_by', $inspectorId);
            }

            foreach ($query->get(['unit_id', 'first_result', 'second_result']) as $checklist) {
                $key = $unitKey[(int) $checklist->unit_id] ?? null;
                $result = $checklist->second_result ?? $checklist->first_result;

                if ($key === null || ! in_array($result, ['approved', 'rejected'], true)) {
                    continue;
                }

                if (($best[$key] ?? null) !== 'approved') {
                    $best[$key] = $result;
                }
            }
        }

        $ok = count(array_filter($best, fn (string $result) => $result === 'approved'));
        $falta = count($best) - $ok;

        return $this->ring(
            'inspecciones',
            'Inspecciones de seguridad',
            'inspeccion',
            'status',
            $ok,
            max(0, $total - $ok - $falta),
            $falta,
            0,
            $total,
        );
    }

    /**
     * @param  Collection<int, Induction>  $sessions
     * @param  Collection<string, array{license: string, coordinator: string|null, units?: list<int>, name?: string}>  $drivers
     * @return list<array<string, mixed>>
     */
    private function inductionRings(Collection $sessions, Collection $drivers, int $total): array
    {
        $unitKey = [];
        $names = [];

        foreach ($drivers as $key => $driver) {
            foreach ($driver['units'] ?? [] as $unitId) {
                $unitKey[(int) $unitId] = $key;
            }

            $name = $driver['name'] ?? '';

            if ($name !== '' && ! isset($names[$name])) {
                $names[$name] = $key;
            }
        }

        $groups = [];

        foreach ($sessions as $induction) {
            $label = $this->inductionLabel($induction);
            $key = $this->normalize($label);

            if ($key === '') {
                continue;
            }

            $groups[$key] ??= [
                'label' => $label,
                'ok' => [],
                'listed' => [],
            ];

            foreach ($induction->attendees as $attendee) {
                $driverKey = $this->attendeeKey($attendee, $unitKey, $names, $drivers);

                if ($driverKey === null) {
                    continue;
                }

                $groups[$key]['listed'][$driverKey] = true;

                if ($this->attended($attendee)) {
                    $groups[$key]['ok'][$driverKey] = true;
                }
            }
        }

        $rings = [];

        foreach ($groups as $key => $group) {
            $ok = count($group['ok']);
            $listed = count($group['listed']);
            $falta = max(0, $listed - $ok);

            $rings[] = $this->ring(
                'induccion-'.$key,
                $group['label'],
                'induccion',
                'status',
                $ok,
                max(0, $total - $ok - $falta),
                $falta,
                0,
                $total,
            );
        }

        usort($rings, fn (array $left, array $right) => strnatcasecmp($left['label'], $right['label']));

        return $rings;
    }

    private function inductionLabel(Induction $induction): string
    {
        $title = trim((string) $induction->title);

        if ($title !== '') {
            return $title;
        }

        return InductionFormOptions::activities()[$induction->activity] ?? 'Inducción';
    }

    /**
     * @return array<string, mixed>
     */
    private function ring(
        string $key,
        string $label,
        string $source,
        string $mode,
        int $ok,
        int $baja,
        int $falta,
        int $programar,
        int $total,
    ): array {
        $percent = $mode === 'programar'
            ? ($total > 0 ? 100 : 0)
            : ($total > 0 ? (int) round(($ok / $total) * 100) : 0);

        return [
            'key' => $key,
            'label' => $label,
            'source' => $source,
            'mode' => $mode,
            'ok' => $ok,
            'baja' => $baja,
            'falta' => $falta,
            'programar' => $programar,
            'total' => $total,
            'percent' => $percent,
        ];
    }

    /**
     * @param  array<int, string>  $unitKey
     * @param  array<string, string>  $names
     * @param  Collection<string, mixed>  $drivers
     */
    private function attendeeKey(
        InductionAttendee $attendee,
        array $unitKey,
        array $names,
        Collection $drivers,
    ): ?string {
        if ($attendee->unit_id && isset($unitKey[(int) $attendee->unit_id])) {
            return $unitKey[(int) $attendee->unit_id];
        }

        $byDni = $this->identity($attendee->driver_dni, null);

        if ($byDni !== null && $drivers->has($byDni)) {
            return $byDni;
        }

        $name = $this->normalize($attendee->driver_name);

        return ($name !== '' && isset($names[$name])) ? $names[$name] : null;
    }

    private function attended(InductionAttendee $attendee): bool
    {
        return $attendee->status === 'attended' || filled($attendee->signature_path);
    }

    private function identity(?string $dni, ?string $name): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $dni) ?? '';

        if ($digits !== '') {
            return 'dni:'.$digits;
        }

        $normalized = $this->normalize($name);

        return $normalized === '' ? null : 'name:'.$normalized;
    }

    /**
     * @param  Collection<int, UnitDocument>  $documents
     */
    private function licenseStatus(Collection $documents): string
    {
        if ($documents->isEmpty()) {
            return 'baja';
        }

        $today = now()->toDateString();
        $valid = $documents->contains(
            fn (UnitDocument $document) => $document->expires_at === null
                || $document->expires_at->toDateString() >= $today,
        );

        return $valid ? 'ok' : 'falta';
    }

    private function betterLicense(string $current, string $next): string
    {
        $rank = ['ok' => 3, 'falta' => 2, 'baja' => 1];

        return ($rank[$next] ?? 0) > ($rank[$current] ?? 0) ? $next : $current;
    }

    private function normalize(?string $value): string
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

    /**
     * @return list<array{id: int, name: string}>
     */
    private function coordinatorOptions(?int $forcedId): array
    {
        $coordinators = SystemRoles::coordinators();

        if ($forcedId) {
            $coordinators = $coordinators->where('id', $forcedId)->values();
        }

        return $coordinators
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
            ])
            ->all();
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function inspectorOptions(): array
    {
        return SystemRoles::inspectors()
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
            ])
            ->all();
    }

    /**
     * Sedes activas del catálogo de Lugares.
     *
     * @return list<array{id: int, name: string}>
     */
    private function sedeOptions(): array
    {
        return Site::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Site $site) => [
                'id' => (int) $site->id,
                'name' => (string) $site->name,
            ])
            ->all();
    }

    /**
     * Coordinadores asignados a un lugar de esa sede.
     *
     * @return list<int>
     */
    private function coordinatorIdsForSite(int $siteId): array
    {
        return User::query()
            ->where(function ($query) use ($siteId) {
                $query
                    ->whereHas('places', fn ($places) => $places->where('places.site_id', $siteId))
                    ->orWhereHas('place', fn ($place) => $place->where('places.site_id', $siteId));
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
