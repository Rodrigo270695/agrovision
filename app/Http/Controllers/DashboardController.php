<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitDocument;
use App\Support\InductionStatuses;
use App\Support\SystemRoles;
use App\Support\UnitDocumentTypes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $today = Carbon::today();
        $unitsQuery = $this->scopedUnitsQuery();
        $unitIds = (clone $unitsQuery)->pluck('id');

        $activePeriod = Period::query()
            ->where('status', 'active')
            ->orderByDesc('date')
            ->first(['id', 'name', 'date', 'status']);

        $unitsTotal = (clone $unitsQuery)->count();
        $providers = (clone $unitsQuery)->distinct()->count('provider');
        $withoutPlate = (clone $unitsQuery)
            ->where(function (Builder $query): void {
                $query->whereNull('plate_number')->orWhere('plate_number', '');
            })
            ->count();

        $documentCompliance = $this->documentCompliance($unitIds);
        $expiry = $this->documentExpiryBuckets($unitIds, $today);

        $checklistsQuery = $this->scopedChecklistsQuery();
        $inspections = [
            'total' => (clone $checklistsQuery)->count(),
            'draft' => (clone $checklistsQuery)->where('status', 'draft')->count(),
            'completed' => (clone $checklistsQuery)->where('status', 'completed')->count(),
            'first_approved' => (clone $checklistsQuery)->where('first_result', 'approved')->count(),
            'first_rejected' => (clone $checklistsQuery)->where('first_result', 'rejected')->count(),
            'second_approved' => (clone $checklistsQuery)->where('second_result', 'approved')->count(),
            'second_rejected' => (clone $checklistsQuery)->where('second_result', 'rejected')->count(),
            'observed' => (clone $checklistsQuery)
                ->where('coordinator_status', UnitChecklist::COORDINATOR_OBSERVED)
                ->count(),
            'reviewed' => (clone $checklistsQuery)
                ->where('coordinator_status', UnitChecklist::COORDINATOR_REVIEWED)
                ->count(),
        ];

        $firstDecided = $inspections['first_approved'] + $inspections['first_rejected'];
        $inspectionPassRate = $firstDecided > 0
            ? (int) round(($inspections['first_approved'] / $firstDecided) * 100)
            : null;

        $inductionsQuery = $this->scopedInductionsQuery();
        $inductionIds = (clone $inductionsQuery)->pluck('id');
        $inductions = [
            'total' => $inductionIds->count(),
            'scheduled' => (clone $inductionsQuery)->where('status', InductionStatuses::SCHEDULED)->count(),
            'in_progress' => (clone $inductionsQuery)->where('status', InductionStatuses::IN_PROGRESS)->count(),
            'closed' => (clone $inductionsQuery)->where('status', InductionStatuses::CLOSED)->count(),
            'attendees' => [
                'attended' => InductionAttendee::query()
                    ->whereIn('induction_id', $inductionIds)
                    ->where('status', 'attended')
                    ->count(),
                'registered' => InductionAttendee::query()
                    ->whereIn('induction_id', $inductionIds)
                    ->where('status', 'registered')
                    ->count(),
            ],
        ];

        $vehicleBreakdown = (clone $unitsQuery)
            ->selectRaw("COALESCE(NULLIF(TRIM(vehicle_type), ''), 'Sin tipo') as label, COUNT(*) as value")
            ->groupBy('label')
            ->orderByDesc('value')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->label,
                'value' => (int) $row->value,
            ])
            ->values()
            ->all();

        $providerBreakdown = (clone $unitsQuery)
            ->selectRaw('provider as label, COUNT(*) as value')
            ->groupBy('provider')
            ->orderByDesc('value')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->label,
                'value' => (int) $row->value,
            ])
            ->values()
            ->all();

        $fromMonth = $today->copy()->subMonths(5)->startOfMonth();
        $trendUnits = (clone $unitsQuery)
            ->where(function (Builder $query) use ($fromMonth): void {
                $query->whereDate('service_date', '>=', $fromMonth)
                    ->orWhere(function (Builder $inner) use ($fromMonth): void {
                        $inner->whereNull('service_date')
                            ->where('created_at', '>=', $fromMonth);
                    });
            })
            ->get(['service_date', 'created_at']);

        $trendCounts = [];
        foreach ($trendUnits as $unit) {
            $anchor = $unit->service_date ?? $unit->created_at;
            if (! $anchor) {
                continue;
            }
            $key = Carbon::parse($anchor)->format('Y-m');
            $trendCounts[$key] = ($trendCounts[$key] ?? 0) + 1;
        }

        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $today->copy()->subMonths($i);
            $key = $month->format('Y-m');
            $trend[] = [
                'label' => $month->format('M Y'),
                'value' => (int) ($trendCounts[$key] ?? 0),
            ];
        }

        $criticalAlerts = $this->criticalDocumentAlerts($unitIds, $today);

        $semaforos = [
            $this->semaforo(
                key: 'documentacion',
                label: 'Cumplimiento documental',
                percent: $documentCompliance['percent'],
                detail: "{$documentCompliance['complete']} de {$documentCompliance['units']} unidades con 6/6 docs",
                greenFrom: 85,
                amberFrom: 60,
            ),
            $this->semaforo(
                key: 'inspecciones',
                label: 'Aprobación 1ra inspección',
                percent: $inspectionPassRate,
                detail: $firstDecided > 0
                    ? "{$inspections['first_approved']} aprobadas · {$inspections['first_rejected']} desaprobadas"
                    : 'Sin inspecciones decididas aún',
                greenFrom: 85,
                amberFrom: 70,
            ),
            $this->expirySemaforo($expiry),
            $this->semaforo(
                key: 'consolidados',
                label: 'Consolidados pendientes',
                percent: $this->pendingConsolidationPercent($inspections),
                detail: "{$inspections['observed']} observados · {$inspections['reviewed']} revisados",
                greenFrom: 80,
                amberFrom: 50,
                invert: true,
            ),
        ];

        return Inertia::render('dashboard', [
            'generatedAt' => now()->timezone(config('app.timezone'))->toIso8601String(),
            'activePeriod' => $activePeriod ? [
                'id' => $activePeriod->id,
                'name' => $activePeriod->name,
                'date' => optional($activePeriod->date)?->toDateString(),
            ] : null,
            'kpis' => [
                [
                    'key' => 'units',
                    'label' => 'Unidades',
                    'value' => $unitsTotal,
                    'hint' => 'Flota en alcance',
                    'tone' => 'blue',
                    'href' => '/unidades',
                ],
                [
                    'key' => 'docs',
                    'label' => 'Docs al día',
                    'value' => $documentCompliance['percent'].'%',
                    'hint' => '6 obligatorios / unidad',
                    'tone' => 'teal',
                    'href' => '/unidades',
                ],
                [
                    'key' => 'inspections',
                    'label' => 'Inspecciones',
                    'value' => $inspections['total'],
                    'hint' => "{$inspections['completed']} completadas",
                    'tone' => 'indigo',
                    'href' => '/inspecciones',
                ],
                [
                    'key' => 'pass_rate',
                    'label' => 'Aprobación 1ra',
                    'value' => $inspectionPassRate === null ? '—' : $inspectionPassRate.'%',
                    'hint' => 'KPI SST inspección',
                    'tone' => 'green',
                    'href' => '/inspecciones',
                ],
                [
                    'key' => 'expiring',
                    'label' => 'Docs críticos',
                    'value' => $expiry['danger'] + $expiry['expired'],
                    'hint' => '≤7 días o vencidos',
                    'tone' => 'rose',
                    'href' => '/unidades',
                ],
                [
                    'key' => 'inductions',
                    'label' => 'Inducciones',
                    'value' => $inductions['total'],
                    'hint' => "{$inductions['in_progress']} en curso",
                    'tone' => 'amber',
                    'href' => '/inducciones',
                ],
                [
                    'key' => 'providers',
                    'label' => 'Proveedores',
                    'value' => $providers,
                    'hint' => 'Transportistas activos',
                    'tone' => 'violet',
                    'href' => '/unidades',
                ],
                [
                    'key' => 'without_plate',
                    'label' => 'Sin placa',
                    'value' => $withoutPlate,
                    'hint' => 'Datos incompletos',
                    'tone' => 'slate',
                    'href' => '/unidades',
                ],
            ],
            'semaforos' => $semaforos,
            'charts' => [
                'inspections' => [
                    ['label' => 'Borradores', 'value' => $inspections['draft'], 'color' => '#94a3b8'],
                    ['label' => 'Completadas', 'value' => $inspections['completed'], 'color' => '#2e5a9e'],
                    ['label' => '1ra aprobada', 'value' => $inspections['first_approved'], 'color' => '#3d8b6e'],
                    ['label' => '1ra rechazada', 'value' => $inspections['first_rejected'], 'color' => '#c07070'],
                    ['label' => 'Observados', 'value' => $inspections['observed'], 'color' => '#d4a017'],
                    ['label' => 'Revisados', 'value' => $inspections['reviewed'], 'color' => '#4a90e2'],
                ],
                'documents_expiry' => [
                    ['label' => 'Vigentes (>20d)', 'value' => $expiry['ok'], 'color' => '#6fa88a'],
                    ['label' => 'Por vencer (≤20d)', 'value' => $expiry['warning'], 'color' => '#d4a84b'],
                    ['label' => 'Críticos (≤7d)', 'value' => $expiry['danger'], 'color' => '#c07070'],
                    ['label' => 'Vencidos', 'value' => $expiry['expired'], 'color' => '#9a5050'],
                    ['label' => 'Sin fecha / DNI', 'value' => $expiry['none'], 'color' => '#a8b8c8'],
                ],
                'vehicles' => $vehicleBreakdown,
                'providers' => $providerBreakdown,
                'units_trend' => $trend,
                'inductions' => [
                    ['label' => 'Programadas', 'value' => $inductions['scheduled'], 'color' => '#4a90e2'],
                    ['label' => 'En curso', 'value' => $inductions['in_progress'], 'color' => '#d4a84b'],
                    ['label' => 'Cerradas', 'value' => $inductions['closed'], 'color' => '#3d8b6e'],
                ],
            ],
            'inductionsSummary' => [
                'attended' => $inductions['attendees']['attended'],
                'registered' => $inductions['attendees']['registered'],
            ],
            'alerts' => $criticalAlerts,
        ]);
    }

    /**
     * @return Builder<Unit>
     */
    private function scopedUnitsQuery(): Builder
    {
        $query = Unit::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        return $query;
    }

    /**
     * @return Builder<UnitChecklist>
     */
    private function scopedChecklistsQuery(): Builder
    {
        $query = UnitChecklist::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', function (Builder $unitQuery): void {
                $unitQuery->where('coordinator_id', Auth::id());
            });
        }

        return $query;
    }

    /**
     * @return Builder<Induction>
     */
    private function scopedInductionsQuery(): Builder
    {
        $query = Induction::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('created_by', Auth::id());
        }

        return $query;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>|iterable<int, int>  $unitIds
     * @return array{units: int, complete: int, percent: int}
     */
    private function documentCompliance(iterable $unitIds): array
    {
        $ids = collect($unitIds)->values();
        $unitsCount = $ids->count();

        if ($unitsCount === 0) {
            return ['units' => 0, 'complete' => 0, 'percent' => 0];
        }

        $documents = UnitDocument::query()
            ->whereIn('unit_id', $ids)
            ->get(['unit_id', 'type']);

        $byUnit = $documents->groupBy('unit_id');
        $complete = 0;

        foreach ($ids as $unitId) {
            $progress = UnitDocumentTypes::progress($byUnit->get($unitId, collect()));
            if ($progress['percent'] >= 100) {
                $complete++;
            }
        }

        return [
            'units' => $unitsCount,
            'complete' => $complete,
            'percent' => (int) round(($complete / $unitsCount) * 100),
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>|iterable<int, int>  $unitIds
     * @return array{ok: int, warning: int, danger: int, expired: int, none: int}
     */
    private function documentExpiryBuckets(iterable $unitIds, Carbon $today): array
    {
        $ids = collect($unitIds)->values();
        $buckets = [
            'ok' => 0,
            'warning' => 0,
            'danger' => 0,
            'expired' => 0,
            'none' => 0,
        ];

        if ($ids->isEmpty()) {
            return $buckets;
        }

        $documents = UnitDocument::query()
            ->whereIn('unit_id', $ids)
            ->get(['type', 'expires_at']);

        foreach ($documents as $document) {
            if ($document->type === UnitDocumentTypes::DRIVER_DNI || $document->expires_at === null) {
                $buckets['none']++;

                continue;
            }

            $expiresDay = $document->expires_at->copy()->startOfDay();
            $baseDay = $today->copy()->startOfDay();
            $days = (int) round(
                ($expiresDay->getTimestamp() - $baseDay->getTimestamp()) / 86400,
            );

            if ($days < 0) {
                $buckets['expired']++;
            } elseif ($days <= 7) {
                $buckets['danger']++;
            } elseif ($days <= 20) {
                $buckets['warning']++;
            } else {
                $buckets['ok']++;
            }
        }

        return $buckets;
    }

    /**
     * @param  array{ok: int, warning: int, danger: int, expired: int, none: int}  $expiry
     * @return array{key: string, label: string, status: string, value: string, detail: string}
     */
    private function expirySemaforo(array $expiry): array
    {
        $critical = $expiry['danger'] + $expiry['expired'];

        if ($critical > 0) {
            $status = 'red';
            $value = (string) $critical;
            $detail = "{$expiry['expired']} vencidos · {$expiry['danger']} ≤7 días";
        } elseif ($expiry['warning'] > 0) {
            $status = 'amber';
            $value = (string) $expiry['warning'];
            $detail = "{$expiry['warning']} documentos vencen en ≤20 días";
        } else {
            $status = 'green';
            $value = '0';
            $detail = 'Sin alertas de vencimiento críticas';
        }

        return [
            'key' => 'vencimientos',
            'label' => 'Vencimientos documentales',
            'status' => $status,
            'value' => $value,
            'detail' => $detail,
        ];
    }

    /**
     * @param  array{observed: int, reviewed: int}  $inspections
     */
    private function pendingConsolidationPercent(array $inspections): ?int
    {
        $total = $inspections['observed'] + $inspections['reviewed'];

        if ($total === 0) {
            return null;
        }

        // Invertiremos en semaforo: alto % revisados = verde
        return (int) round(($inspections['reviewed'] / $total) * 100);
    }

    /**
     * @return array{key: string, label: string, status: string, value: string, detail: string}
     */
    private function semaforo(
        string $key,
        string $label,
        ?int $percent,
        string $detail,
        int $greenFrom,
        int $amberFrom,
        bool $invert = false,
    ): array {
        if ($percent === null) {
            return [
                'key' => $key,
                'label' => $label,
                'status' => 'neutral',
                'value' => '—',
                'detail' => $detail,
            ];
        }

        $score = $invert ? $percent : $percent;

        if ($score >= $greenFrom) {
            $status = 'green';
        } elseif ($score >= $amberFrom) {
            $status = 'amber';
        } else {
            $status = 'red';
        }

        return [
            'key' => $key,
            'label' => $label,
            'status' => $status,
            'value' => $percent.'%',
            'detail' => $detail,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>|iterable<int, int>  $unitIds
     * @return list<array{unit_id: int, correlative: string, plate: string|null, type: string, type_label: string, expires_at: string, days_left: int, level: string}>
     */
    private function criticalDocumentAlerts(iterable $unitIds, Carbon $today): array
    {
        $ids = collect($unitIds)->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $limitDate = $today->copy()->addDays(20);

        $documents = UnitDocument::query()
            ->with('unit:id,correlative,plate_number')
            ->whereIn('unit_id', $ids)
            ->where('type', '!=', UnitDocumentTypes::DRIVER_DNI)
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '<=', $limitDate)
            ->orderBy('expires_at')
            ->limit(12)
            ->get();

        return $documents->map(function (UnitDocument $document) use ($today): array {
            $expiresDay = $document->expires_at->copy()->startOfDay();
            $baseDay = $today->copy()->startOfDay();
            $days = (int) round(
                ($expiresDay->getTimestamp() - $baseDay->getTimestamp()) / 86400,
            );
            $level = $days < 0 ? 'expired' : ($days <= 7 ? 'danger' : 'warning');

            return [
                'unit_id' => $document->unit_id,
                'correlative' => $document->unit?->correlative ?? '—',
                'plate' => $document->unit?->plate_number,
                'type' => $document->type,
                'type_label' => UnitDocumentTypes::label($document->type),
                'expires_at' => $document->expires_at?->toDateString() ?? '',
                'days_left' => $days,
                'level' => $level,
            ];
        })->all();
    }
}
