<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Unit;
use App\Models\UnitDocument;
use App\Support\SystemRoles;
use App\Support\UnitDocumentTypes;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DriverBoardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'week' => ['nullable', 'string', 'max:20'],
            'coordinator_id' => ['nullable', 'integer'],
            'sede' => ['nullable', 'string', 'max:255'],
        ]);

        $week = $this->resolveWeek($validated['week'] ?? null);
        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;
        $sede = trim((string) ($validated['sede'] ?? ''));
        $sede = $sede === '' ? null : $sede;

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        $drivers = $this->drivers($coordinatorId);
        $sessions = $this->sessions($week, $sede);
        $covered = $this->coveredTopics($sessions, $drivers);

        $coordinatorNames = $drivers
            ->pluck('coordinator')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return Inertia::render('driver-board/index', [
            'sections' => $this->sections($drivers, $covered),
            'summary' => [
                'drivers' => $drivers->count(),
                'week_label' => $week['label'],
                'week_number' => $week['number'],
                'coordinators' => $coordinatorNames,
                'sede' => $sede,
            ],
            'filters' => [
                'week' => $week['value'],
                'coordinator_id' => $coordinatorId,
                'sede' => $sede,
            ],
            'weeks' => $this->weekOptions(),
            'coordinators' => $this->coordinatorOptions($coordinatorId),
            'sedes' => $this->sedeOptions(),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    /**
     * @return Collection<string, array{license: string, coordinator: string|null}>
     */
    private function drivers(?int $coordinatorId): Collection
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
    private function sessions(array $week, ?string $sede): Collection
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

        if ($week['value'] !== 'all') {
            $query->where(function ($builder) use ($week) {
                $builder
                    ->whereBetween('session_date', [$week['from'], $week['to']])
                    ->orWhere(function ($inner) use ($week) {
                        $inner
                            ->whereNull('session_date')
                            ->whereBetween('scheduled_at', [
                                $week['from'].' 00:00:00',
                                $week['to'].' 23:59:59',
                            ]);
                    });
            });
        }

        if ($sede !== null) {
            $query->whereRaw('lower(trim(sede)) = ?', [$this->normalize($sede)]);
        }

        return $query->get();
    }

    /**
     * @param  Collection<int, Induction>  $sessions
     * @param  Collection<string, array{license: string, coordinator: string|null, units?: list<int>}>  $drivers
     * @return array<string, array{sessions: int, ok: array<string, true>, listed: array<string, true>}>
     */
    private function coveredTopics(Collection $sessions, Collection $drivers): array
    {
        $unitKey = [];

        foreach ($drivers as $key => $driver) {
            foreach ($driver['units'] ?? [] as $unitId) {
                $unitKey[$unitId] = $key;
            }
        }

        $names = [];

        foreach ($drivers as $key => $driver) {
            $name = $driver['name'] ?? '';

            if ($name !== '' && ! isset($names[$name])) {
                $names[$name] = $key;
            }
        }

        $covered = [];

        foreach (array_keys($this->topicNeedles()) as $topic) {
            $covered[$topic] = [
                'sessions' => 0,
                'ok' => [],
                'listed' => [],
            ];
        }

        foreach ($sessions as $induction) {
            $topics = $this->topicKeys($induction);

            foreach ($topics as $topic) {
                $covered[$topic]['sessions']++;

                foreach ($induction->attendees as $attendee) {
                    $key = $this->attendeeKey($attendee, $unitKey, $names, $drivers);

                    if ($key === null) {
                        continue;
                    }

                    $covered[$topic]['listed'][$key] = true;

                    if ($this->attended($attendee)) {
                        $covered[$topic]['ok'][$key] = true;
                    }
                }
            }
        }

        return $covered;
    }

    /**
     * @param  Collection<string, array{license: string, coordinator: string|null}>  $drivers
     * @param  array<string, array{sessions: int, ok: array<string, true>, listed: array<string, true>}>  $covered
     * @return list<array<string, mixed>>
     */
    private function sections(Collection $drivers, array $covered): array
    {
        $total = $drivers->count();

        return collect($this->groupDefinitions())
            ->map(function (array $group) use ($drivers, $covered, $total) {
                $items = collect($group['items'])->map(function (array $item) use ($drivers, $covered, $total) {
                    if (($item['source'] ?? null) === 'license') {
                        return $this->licenseRing($item, $drivers, $total);
                    }

                    return $this->trainingRing($item, $covered[$item['key']] ?? null, $total);
                })->all();

                return [
                    'key' => $group['key'],
                    'title' => $group['title'],
                    'items' => $items,
                ];
            })
            ->all();
    }

    /**
     * @param  array{key: string, label: string}  $item
     * @param  Collection<string, array{license: string, coordinator: string|null}>  $drivers
     * @return array<string, mixed>
     */
    private function licenseRing(array $item, Collection $drivers, int $total): array
    {
        $ok = $drivers->where('license', 'ok')->count();
        $falta = $drivers->where('license', 'falta')->count();
        $baja = $drivers->where('license', 'baja')->count();

        return $this->ring($item['key'], $item['label'], 'status', $ok, $baja, $falta, 0, $total);
    }

    /**
     * @param  array{key: string, label: string}  $item
     * @param  array{sessions: int, ok: array<string, true>, listed: array<string, true>}|null  $topic
     * @return array<string, mixed>
     */
    private function trainingRing(array $item, ?array $topic, int $total): array
    {
        if ($topic === null || $topic['sessions'] === 0) {
            return $this->ring($item['key'], $item['label'], 'programar', 0, 0, 0, $total, $total);
        }

        $ok = count($topic['ok']);
        $listed = count($topic['listed']);
        $falta = max(0, $listed - $ok);
        $baja = max(0, $total - $ok - $falta);

        return $this->ring($item['key'], $item['label'], 'status', $ok, $baja, $falta, 0, $total);
    }

    /**
     * @return array<string, mixed>
     */
    private function ring(
        string $key,
        string $label,
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
     * @return list<array{key: string, title: string, items: list<array{key: string, label: string, source?: string}>}>
     */
    private function groupDefinitions(): array
    {
        return [
            [
                'key' => 'mtc',
                'title' => 'Requisitos solicitados por MTC',
                'items' => [
                    ['key' => 'licencia', 'label' => 'Licencia de conducir', 'source' => 'license'],
                    ['key' => 'vial', 'label' => 'Seguridad en las vías'],
                ],
            ],
            [
                'key' => 'sst',
                'title' => 'Requisitos de ley de SST',
                'items' => [
                    ['key' => 'general', 'label' => 'Inducción general en SST'],
                    ['key' => 'iperc', 'label' => 'Capacitación de IPERC'],
                    ['key' => 'defensiva', 'label' => 'Capacitación de manejo a la defensiva'],
                    ['key' => 'accidentes', 'label' => 'Capacitación de investig. accidentes'],
                ],
            ],
            [
                'key' => 'otros',
                'title' => 'Otros requisitos',
                'items' => [
                    ['key' => 'inspecciones', 'label' => 'Capacitación de inspecciones de SST'],
                    ['key' => 'extintores', 'label' => 'Uso de extintores'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    private function topicNeedles(): array
    {
        return [
            'vial' => ['seguridad en las vias', 'seguridad vial'],
            'general' => ['induccion general', 'induccion sst', 'induccion en sst', 'induccion de sst'],
            'iperc' => ['iperc'],
            'defensiva' => ['defensiv'],
            'accidentes' => ['accident'],
            'inspecciones' => ['inspeccion'],
            'extintores' => ['extintor'],
        ];
    }

    /**
     * @return list<string>
     */
    private function topicKeys(Induction $induction): array
    {
        $text = $this->normalize(trim($induction->title.' '.$induction->temario));
        $keys = [];

        foreach ($this->topicNeedles() as $key => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($text, $needle)) {
                    $keys[] = $key;
                    break;
                }
            }
        }

        if ($keys === [] && $induction->activity === 'induccion') {
            $keys[] = 'general';
        }

        return $keys;
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
     * @return array{value: string, label: string, number: int|null, from: string|null, to: string|null}
     */
    private function resolveWeek(?string $requested): array
    {
        if ($requested === 'all') {
            return [
                'value' => 'all',
                'label' => 'Todas las semanas',
                'number' => null,
                'from' => null,
                'to' => null,
            ];
        }

        $monday = $this->mondayOf($requested) ?? now()->startOfWeek(Carbon::MONDAY);

        return $this->weekPayload($monday);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function weekOptions(): array
    {
        $dates = Induction::query()
            ->where(function ($builder) {
                $builder
                    ->whereNull('period_id')
                    ->orWhereHas('period', fn ($period) => $period->where('status', 'active'));
            })
            ->get(['session_date', 'scheduled_at'])
            ->map(function (Induction $induction) {
                $date = $induction->session_date ?? $induction->scheduled_at;

                return $date ? Carbon::parse($date)->toDateString() : null;
            })
            ->filter();

        $mondays = $dates
            ->map(fn ($date) => Carbon::parse($date)->startOfWeek(Carbon::MONDAY)->toDateString())
            ->push(now()->startOfWeek(Carbon::MONDAY)->toDateString())
            ->unique()
            ->sortDesc()
            ->take(16)
            ->values();

        $options = [[
            'value' => 'all',
            'label' => 'Todas las semanas',
        ]];

        foreach ($mondays as $monday) {
            $payload = $this->weekPayload(Carbon::parse($monday));
            $options[] = [
                'value' => $payload['value'],
                'label' => $payload['label'],
            ];
        }

        return $options;
    }

    /**
     * @return array{value: string, label: string, number: int, from: string, to: string}
     */
    private function weekPayload(CarbonInterface $monday): array
    {
        $start = Carbon::parse($monday)->startOfDay();
        $end = $start->copy()->addDays(6);

        return [
            'value' => $start->toDateString(),
            'label' => 'Semana '.$start->isoWeek().' · '.$start->format('d/m').' al '.$end->format('d/m'),
            'number' => $start->isoWeek(),
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
        ];
    }

    private function mondayOf(?string $value): ?Carbon
    {
        if ($value === null || $value === '' || $value === 'all') {
            return null;
        }

        try {
            return Carbon::parse($value)->startOfWeek(Carbon::MONDAY);
        } catch (\Throwable) {
            return null;
        }
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
     * @return list<string>
     */
    private function sedeOptions(): array
    {
        return Induction::query()
            ->whereNotNull('sede')
            ->where('sede', '!=', '')
            ->pluck('sede')
            ->map(fn ($sede) => trim((string) $sede))
            ->filter()
            ->unique(fn (string $sede) => $this->normalize($sede))
            ->sort()
            ->values()
            ->all();
    }
}
