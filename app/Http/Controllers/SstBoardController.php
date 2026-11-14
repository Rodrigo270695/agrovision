<?php

namespace App\Http\Controllers;

use App\Models\ChecklistTemplate;
use App\Models\Unit;
use App\Support\ReportPeriod;
use App\Support\SstBoardItemDetailReport;
use App\Support\SystemRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SstBoardController extends Controller
{
    public function __construct(
        private readonly SstBoardItemDetailReport $itemDetailReport,
    ) {}

    public function __invoke(Request $request): Response
    {
        $context = $this->filterContext($request);
        $template = $context['template'];
        $inspection = $context['inspection'];
        $range = $context['range'];
        $coordinatorId = $context['coordinator_id'];
        $inspectorId = $context['inspector_id'];
        $vehicleTypes = $context['vehicle_types'];

        $board = $this->itemDetailReport->board(
            $template,
            $range,
            $coordinatorId,
            $vehicleTypes,
            $inspectorId,
            $inspection,
        );

        return Inertia::render('sst-board/index', [
            'items' => $board['items'],
            'summary' => [
                'units' => $board['units'],
                'week_label' => $range['label'],
                'coordinators' => $board['coordinators'],
                'vehicle_types' => $board['vehicle_types'],
                'template_label' => ChecklistTemplate::query()->where('type', $template)->first()?->displayLabel()
                    ?? mb_strtoupper($template),
            ],
            'filters' => [
                'date_from' => $range['from'],
                'date_to' => $range['to'],
                'coordinator_id' => $coordinatorId,
                'inspector_id' => $inspectorId,
                'vehicle_types' => $vehicleTypes->all(),
                'template' => $template,
                'inspection' => $inspection,
            ],
            'coordinators' => $this->coordinatorOptions($coordinatorId),
            'inspectors' => $this->inspectorOptions(),
            'vehicle_options' => $this->vehicleOptions(),
            'templateOptions' => ChecklistTemplate::options(),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    public function itemDetail(Request $request, string $item): Response
    {
        $context = $this->filterContext($request);
        $itemNumber = trim($item);

        if ($itemNumber === '') {
            abort(404);
        }

        $report = $this->itemDetailReport->build(
            $context['template'],
            $itemNumber,
            $context['range'],
            $context['coordinator_id'],
            $context['vehicle_types'],
            $context['inspector_id'],
            $context['inspection'],
        );

        return Inertia::render('sst-board/item-detail', [
            ...$report,
            'filters' => [
                'date_from' => $context['range']['from'],
                'date_to' => $context['range']['to'],
                'coordinator_id' => $context['coordinator_id'],
                'inspector_id' => $context['inspector_id'],
                'vehicle_types' => $context['vehicle_types']->all(),
                'template' => $context['template'],
                'inspection' => $context['inspection'],
            ],
            'summary_meta' => [
                'template_label' => ChecklistTemplate::query()->where('type', $context['template'])->first()?->displayLabel()
                    ?? mb_strtoupper($context['template']),
                'week_label' => $context['range']['label'],
            ],
        ]);
    }

    public function itemDetailExcel(Request $request, string $item): StreamedResponse
    {
        $context = $this->filterContext($request);
        $itemNumber = trim($item);

        if ($itemNumber === '') {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['ok', 'falta', 'baja', 'pendiente'])],
        ]);

        $status = $validated['status'];
        $labels = [
            'ok' => 'OK',
            'falta' => 'Falta',
            'baja' => 'Baja',
            'pendiente' => 'Pendiente',
        ];

        $report = $this->itemDetailReport->build(
            $context['template'],
            $itemNumber,
            $context['range'],
            $context['coordinator_id'],
            $context['vehicle_types'],
            $context['inspector_id'],
            $context['inspection'],
        );

        return $this->itemDetailReport->downloadUnitsExcel(
            $report['units_by_status'][$status] ?? [],
            $report['item']['label'],
            $labels[$status],
            $context['range']['label'],
        );
    }

    /**
     * @return array{
     *     template: string,
     *     inspection: string,
     *     range: array{from: string|null, to: string|null, label: string},
     *     coordinator_id: int|null,
     *     inspector_id: int|null,
     *     vehicle_types: Collection<int, string>
     * }
     */
    private function filterContext(Request $request): array
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'coordinator_id' => ['nullable', 'integer'],
            'inspector_id' => ['nullable', 'integer'],
            'vehicle_types' => ['nullable', 'array'],
            'vehicle_types.*' => ['string', 'max:80'],
            'template' => ['nullable', 'string', 'max:50', Rule::exists('checklist_templates', 'type')->where('is_active', true)],
            'inspection' => ['nullable', Rule::in(['actual', 'first', 'second'])],
            'all_dates' => ['nullable', 'boolean'],
        ]);

        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        return [
            'template' => $validated['template'] ?? 'tdp',
            'inspection' => $validated['inspection'] ?? 'actual',
            'range' => ReportPeriod::range(
                $validated['date_from'] ?? null,
                $validated['date_to'] ?? null,
                $request->boolean('all_dates'),
            ),
            'coordinator_id' => $coordinatorId,
            'inspector_id' => isset($validated['inspector_id'])
                ? (int) $validated['inspector_id']
                : null,
            'vehicle_types' => collect($validated['vehicle_types'] ?? [])
                ->map(fn ($type) => trim((string) $type))
                ->filter()
                ->unique()
                ->values(),
        ];
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
     * @return list<string>
     */
    private function vehicleOptions(): array
    {
        return Unit::query()
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->whereNotNull('vehicle_type')
            ->where('vehicle_type', '!=', '')
            ->distinct()
            ->orderBy('vehicle_type')
            ->pluck('vehicle_type')
            ->map(fn ($type) => (string) $type)
            ->all();
    }
}
