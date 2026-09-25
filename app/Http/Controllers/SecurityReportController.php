<?php

namespace App\Http\Controllers;

use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
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

class SecurityReportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'week' => ['nullable', 'string', 'max:20'],
            'coordinator_id' => ['nullable', 'integer'],
        ]);

        $week = $this->resolveWeek($validated['week'] ?? 'all');
        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        $units = $this->units($coordinatorId);
        $checklists = $this->latestChecklists($week, $units->pluck('id'));
        $rows = $units->map(fn (Unit $unit) => $this->row($unit, $checklists->get($unit->id)))->values();

        $ok = $rows->where('status', 'ok')->count();
        $baja = $rows->where('status', 'baja')->count();
        $pendiente = $rows->where('status', 'pendiente')->count();
        $total = $rows->count();

        $previous = $this->previousPeriod();
        $previousCounts = $previous
            ? $this->countsByType($this->units($coordinatorId, $previous->id))
            : [];

        return Inertia::render('security-report/index', [
            'fleet' => $this->fleet($rows, $previousCounts),
            'summary' => [
                'total' => $total,
                'ok' => $ok,
                'baja' => $baja,
                'pendiente' => $pendiente,
                'percent' => $total > 0 ? (int) round(($ok / $total) * 100) : 0,
                'week_label' => $week['label'],
                'previous_period' => $previous?->name,
            ],
            'full_coverage' => $this->fullCoverage($rows),
            'exceptions' => $rows
                ->where('status', '!=', 'ok')
                ->values()
                ->map(function (array $row, int $index) {
                    unset($row['answers'], $row['license_ok']);

                    return [
                        'number' => $index + 1,
                        ...$row,
                    ];
                })
                ->all(),
            'filters' => [
                'week' => $week['value'],
                'coordinator_id' => $coordinatorId,
            ],
            'weeks' => $this->weekOptions(),
            'coordinators' => $this->coordinatorOptions($coordinatorId),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    /**
     * @return Collection<int, Unit>
     */
    private function units(?int $coordinatorId, ?int $periodId = null): Collection
    {
        $query = Unit::query()
            ->with([
                'coordinatorUser:id,name',
                'documents' => fn ($builder) => $builder
                    ->where('type', UnitDocumentTypes::DRIVER_LICENSE)
                    ->select(['id', 'unit_id', 'type', 'expires_at']),
            ]);

        if ($periodId) {
            $query->where('period_id', $periodId);
        } else {
            $query->whereHas('period', fn ($builder) => $builder->where('status', 'active'));
        }

        if ($coordinatorId) {
            $query->where('coordinator_id', $coordinatorId);
        }

        return $query->orderBy('plate_number')->get();
    }

    /**
     * @param  Collection<int, int>  $unitIds
     * @return Collection<int, UnitChecklist>
     */
    private function latestChecklists(array $week, Collection $unitIds): Collection
    {
        if ($unitIds->isEmpty()) {
            return collect();
        }

        $query = UnitChecklist::query()
            ->with(['answers.item:id,item_number,parent_id'])
            ->whereIn('unit_id', $unitIds->all())
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'));

        if ($week['value'] !== 'all') {
            $query->whereBetween('first_inspected_on', [$week['from'], $week['to']]);
        }

        return $query
            ->get()
            ->groupBy('unit_id')
            ->map(fn (Collection $group) => $group->sortByDesc('id')->first())
            ->filter();
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Unit $unit, ?UnitChecklist $checklist): array
    {
        $notes = trim((string) ($checklist?->additional_observations ?? ''));
        $result = $checklist === null
            ? null
            : ($checklist->second_result !== null ? $checklist->second_result : $checklist->first_result);
        $isBaja = $notes !== '' && str_contains($this->normalize($notes), 'baja');

        if ($isBaja) {
            $status = 'baja';
        } elseif ($result === 'approved') {
            $status = 'ok';
        } else {
            $status = 'pendiente';
        }

        $answers = [];

        foreach ($checklist?->answers ?? [] as $answer) {
            $item = $answer->item;

            if ($item === null || $item->parent_id !== null) {
                continue;
            }

            $value = $checklist->second_result !== null ? $answer->second_value : $answer->first_value;
            $answers[(string) $item->item_number] = $value;
        }

        return [
            'status' => $status,
            'service_type' => $unit->service_type ?: '—',
            'plate' => $unit->plate_number ?: 'S/P',
            'coordinator' => $unit->coordinatorUser?->name ?: '—',
            'responsible' => $unit->responsible_person ?: '—',
            'service_date' => $unit->service_date?->format('d/m/Y') ?: '—',
            'vehicle_type' => trim((string) $unit->vehicle_type) !== ''
                ? mb_strtoupper(trim((string) $unit->vehicle_type))
                : 'Sin tipo',
            'inspection' => $status === 'ok' ? 'OK' : 'NOK',
            'observations' => $notes !== ''
                ? $notes
                : ($status === 'pendiente' ? 'Sin inspección cerrada' : ''),
            'answers' => $answers,
            'license_ok' => $this->licenseOk($unit->documents),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @param  array<string, int>  $previousCounts
     * @return list<array{type: string, count: int, delta: int|null}>
     */
    private function fleet(Collection $rows, array $previousCounts): array
    {
        $hasPrevious = $previousCounts !== [];
        $counts = [];

        foreach ($rows as $row) {
            $type = (string) $row['vehicle_type'];
            $counts[$type] = ($counts[$type] ?? 0) + 1;
        }

        arsort($counts);
        $fleet = [];

        foreach ($counts as $type => $count) {
            $fleet[] = [
                'type' => $type,
                'count' => $count,
                'delta' => $hasPrevious ? $count - ($previousCounts[$type] ?? 0) : null,
            ];
        }

        return $fleet;
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return array<string, int>
     */
    private function countsByType(Collection $units): array
    {
        $counts = [];

        foreach ($units as $unit) {
            $type = trim((string) $unit->vehicle_type);
            $type = $type === '' ? 'Sin tipo' : mb_strtoupper($type);
            $counts[$type] = ($counts[$type] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return list<string>
     */
    private function fullCoverage(Collection $rows): array
    {
        if ($rows->isEmpty()) {
            return [];
        }

        $items = [
            '1' => 'Tarjeta de propiedad',
            '2' => 'SOAT',
            '4' => 'Inspección técnica vehicular',
        ];
        $covered = [];

        foreach ($items as $number => $label) {
            $allYes = $rows->every(
                fn (array $row) => ($row['answers'][$number] ?? null) === 'yes',
            );

            if ($allYes) {
                $covered[] = $label;
            }
        }

        if ($rows->every(fn (array $row) => $row['license_ok'] === true)) {
            $covered[] = 'Licencia de conducir del conductor';
        }

        return $covered;
    }

    /**
     * @param  Collection<int, UnitDocument>  $documents
     */
    private function licenseOk(Collection $documents): bool
    {
        if ($documents->isEmpty()) {
            return false;
        }

        $today = now()->toDateString();

        return $documents->contains(
            fn (UnitDocument $document) => $document->expires_at === null
                || $document->expires_at->toDateString() >= $today,
        );
    }

    private function previousPeriod(): ?Period
    {
        return Period::query()
            ->where('status', '!=', 'active')
            ->orderByDesc('date')
            ->first();
    }

    private function normalize(string $value): string
    {
        $value = mb_strtolower($value);

        return strtr($value, [
            'á' => 'a',
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ú' => 'u',
            'ü' => 'u',
            'ñ' => 'n',
        ]);
    }

    /**
     * @return array{value: string, label: string, number: int|null, from: string|null, to: string|null}
     */
    private function resolveWeek(?string $requested): array
    {
        if ($requested === null || $requested === '' || $requested === 'all') {
            return [
                'value' => 'all',
                'label' => 'Periodo activo',
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
        $dates = UnitChecklist::query()
            ->whereNotNull('first_inspected_on')
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->pluck('first_inspected_on');

        $mondays = $dates
            ->map(fn ($date) => Carbon::parse($date)->startOfWeek(Carbon::MONDAY)->toDateString())
            ->push(now()->startOfWeek(Carbon::MONDAY)->toDateString())
            ->unique()
            ->sortDesc()
            ->take(16)
            ->values();

        $options = [[
            'value' => 'all',
            'label' => 'Periodo activo',
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
}
