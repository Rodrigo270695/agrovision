<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Support\InductionAttendeeStatuses;
use App\Support\InductionFormOptions;
use App\Support\InductionStatuses;
use App\Support\ReportPeriod;
use App\Support\SystemRoles;
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
        $items = $this->inductionRings(
            $sessions,
            $drivers,
            $coordinatorId !== null || $siteId !== null,
        );

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
     * @return Collection<string, array{coordinator: string|null, name: string, units: list<int>}>
     */
    private function drivers(?int $coordinatorId, ?int $siteId): Collection
    {
        $query = Unit::query()
            ->with([
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

        /** @var Collection<string, array{coordinator: string|null, name: string, units: list<int>}> $drivers */
        $drivers = collect();

        foreach ($query->get() as $unit) {
            $key = $this->identity($unit->driver_dni, $unit->driver_name);

            if ($key === null) {
                continue;
            }

            $current = $drivers->get($key, [
                'coordinator' => null,
                'name' => $this->normalize($unit->driver_name),
                'units' => [],
            ]);
            $current['units'][] = (int) $unit->id;
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
            ]);

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

        return $query
            ->orderByDesc('scheduled_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  Collection<int, Induction>  $sessions
     * @param  Collection<string, array{license: string, coordinator: string|null, units?: list<int>, name?: string}>  $drivers
     * @return list<array<string, mixed>>
     */
    private function inductionRings(Collection $sessions, Collection $drivers, bool $restrictAttendees): array
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

        $rings = [];

        foreach ($sessions as $induction) {
            $cited = 0;
            $arrived = 0;
            $missed = 0;
            $pending = 0;

            foreach ($induction->attendees as $attendee) {
                if ($restrictAttendees && $this->attendeeKey($attendee, $unitKey, $names, $drivers) === null) {
                    continue;
                }

                $cited++;

                if ($this->attended($attendee)) {
                    $arrived++;
                } elseif ($attendee->status === InductionAttendeeStatuses::ABSENT) {
                    $missed++;
                } else {
                    $pending++;
                }
            }

            $rings[] = $this->card(
                'induccion-'.$induction->id,
                $this->inductionLabel($induction),
                $this->inductionDetail($induction),
                $cited > 0 ? (int) round(($arrived / $cited) * 100) : 0,
                [
                    $this->metric('citados', 'Citados', $cited, 'muted'),
                    $this->metric('llegaron', 'Llegaron', $arrived, 'ok'),
                    $this->metric('no', 'No llegaron', $missed, 'bad'),
                    $this->metric('pendiente', 'Sin marcar', $pending, 'muted'),
                ],
            );
        }

        return $rings;
    }

    private function inductionDetail(Induction $induction): string
    {
        $when = $induction->scheduled_at
            ? $induction->scheduled_at->timezone(config('app.timezone'))->format('d/m/Y H:i')
            : ($induction->session_date?->format('d/m/Y') ?? 'Sin fecha');

        return $when.' · '.InductionStatuses::label((string) $induction->status);
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
     * @param  list<array{key: string, label: string, value: int, tone: string}>  $metrics
     * @return array<string, mixed>
     */
    private function card(string $key, string $label, string $detail, int $percent, array $metrics): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'detail' => $detail,
            'source' => 'induccion',
            'percent' => $percent,
            'metrics' => $metrics,
        ];
    }

    /**
     * @return array{key: string, label: string, value: int, tone: string}
     */
    private function metric(string $key, string $label, int $value, string $tone): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'value' => $value,
            'tone' => $tone,
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
