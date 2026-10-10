<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
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
        $items = $this->inductionRings($sessions, $drivers);
        $activeDrivers = $drivers->where('active', true)->count();

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
                'drivers' => $activeDrivers,
                'baja' => $drivers->count() - $activeDrivers,
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
     * @return Collection<string, array{coordinator: string|null, name: string, units: list<int>, active: bool}>
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

        /** @var Collection<string, array{coordinator: string|null, name: string, units: list<int>, active: bool}> $drivers */
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
                'active' => false,
            ]);
            $current['units'][] = (int) $unit->id;
            $current['coordinator'] ??= $unit->coordinatorUser?->name;

            if ((string) $unit->status !== 'inactive') {
                $current['active'] = true;
            }

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
     * Una tarjeta por tema de inducción. El anillo es la cobertura de la
     * flota activa: ya la tienen contra los que faltan. De baja son los
     * conductores cuya unidad quedó inactiva en la última carga.
     *
     * @param  Collection<int, Induction>  $sessions
     * @param  Collection<string, array{active?: bool, name?: string}>  $drivers
     * @return list<array<string, mixed>>
     */
    private function inductionRings(Collection $sessions, Collection $drivers): array
    {
        $active = [];

        foreach ($drivers as $key => $driver) {
            if ($driver['active'] ?? false) {
                $active[$key] = true;
            }
        }

        $activeCount = count($active);
        $bajaCount = $drivers->count() - $activeCount;
        $validFrom = now()->subYear()->startOfDay();
        $topics = [];

        foreach ($sessions as $induction) {
            if ($induction->status === InductionStatuses::CANCELLED) {
                continue;
            }

            $titleKey = $this->normalize($this->inductionLabel($induction));

            if ($titleKey === '') {
                continue;
            }

            if (! isset($topics[$titleKey])) {
                $topics[$titleKey] = [
                    'label' => $this->inductionLabel($induction),
                    'covered' => [],
                ];
            }

            $when = $induction->session_date ?? $induction->scheduled_at;

            if ($when === null || $when->lt($validFrom)) {
                continue;
            }

            foreach ($induction->attendees as $attendee) {
                if (! $this->attended($attendee)) {
                    continue;
                }

                $key = $this->identity($attendee->driver_dni, $attendee->driver_name);

                if ($key !== null && isset($active[$key])) {
                    $topics[$titleKey]['covered'][$key] = true;
                }
            }
        }

        $rings = [];

        foreach ($topics as $titleKey => $topic) {
            $have = count($topic['covered']);
            $missing = max(0, $activeCount - $have);

            $rings[] = $this->card(
                'tema-'.$titleKey,
                $topic['label'],
                'Vigente por 1 año',
                $activeCount > 0 ? (int) round(($have / $activeCount) * 100) : 0,
                [
                    $this->metric('tienen', 'Ya la tienen', $have, 'ok'),
                    $this->metric('faltan', 'Faltan', $missing, 'bad'),
                    $this->metric('baja', 'De baja', $bajaCount, 'muted'),
                ],
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
