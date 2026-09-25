<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUnitChecklistRequest;
use App\Http\Requests\UpdateUnitChecklistRequest;
use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\InspectionBatch;
use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitMovement;
use App\Models\UnitChecklistAnswer;
use App\Models\UnitChecklistPhoto;
use App\Models\UnitChecklistSignature;
use App\Services\ParetoChecklistSync;
use App\Support\IndexedRedirect;
use App\Support\InspectionDatabaseExporter;
use App\Support\ParetoCheckTypes;
use App\Support\ParetoPassThreshold;
use App\Support\ParetoPieChart;
use App\Support\PdfLogo;
use App\Support\PermissionCatalog;
use App\Support\SystemRoles;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ChecklistController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'template_type' => ['nullable', Rule::in(['tdp', 'tdc'])],
            'status' => ['nullable', Rule::in(['draft', 'completed'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'sort' => ['nullable', Rule::in(['plate_number', 'created_at', 'first_inspected_on', 'status', 'first_result'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
            'batch_id' => ['nullable', 'integer'],
        ]);

        PermissionCatalog::syncToDatabase();
        $this->attachLooseChecklists();

        $search = trim((string) ($validated['search'] ?? ''));
        $templateType = $validated['template_type'] ?? null;
        $status = $validated['status'] ?? null;
        [$dateFrom, $dateTo] = $this->inspectionDateRange($validated);

        if ($dateFrom === null && $dateTo === null) {
            $today = now()->timezone(config('app.timezone'))->toDateString();
            $dateFrom = $today;
            $dateTo = $today;
        }

        $sort = $validated['sort'] ?? 'first_inspected_on';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = UnitChecklist::query()
            ->with([
                'template:id,type,code,name',
                'period:id,name,date,status',
                'unit:id,correlative,plate_number,period_id,coordinator_id',
            ])
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('plate_number', 'ilike', "%{$search}%")
                    ->orWhere('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('provider', 'ilike', "%{$search}%");
            });
        }

        if ($templateType) {
            $query->whereHas('template', fn ($q) => $q->where('type', $templateType));
        }

        if ($status) {
            $query->where('status', $status);
        }

        $this->applyInspectionDateRange($query, $dateFrom, $dateTo);

        if ($sort === 'first_inspected_on') {
            $directionSql = $direction === 'asc' ? 'asc' : 'desc';
            $query->orderByRaw("first_inspected_on {$directionSql} nulls last")
                ->orderByRaw("first_inspected_time {$directionSql} nulls last");
        } else {
            $query->orderBy($sort, $direction);
        }

        $query->orderByDesc('id');

        $checklists = $query->paginate($perPage)->withQueryString();

        $activePeriodIds = Period::query()->where('status', 'active')->pluck('id');

        $activeUnitsQuery = Unit::query()
            ->whereIn('period_id', $activePeriodIds)
            ->with('period:id,name,status,date')
            ->orderBy('plate_number');

        $statsQuery = UnitChecklist::query()
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $activeUnitsQuery->where('coordinator_id', Auth::id());
            $statsQuery->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        }

        $this->applyInspectionDateRange($statsQuery, $dateFrom, $dateTo);

        $templates = ChecklistTemplate::query()
            ->where('is_active', true)
            ->with(['items', 'signatureRoles'])
            ->orderBy('type')
            ->get();

        $paretoSync = app(ParetoChecklistSync::class);

        return Inertia::render('checklists/index', [
            'checklists' => $checklists,
            'filters' => [
                'search' => $search,
                'template_type' => $templateType,
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'templates' => $templates->map(fn (ChecklistTemplate $template) => [
                'id' => $template->id,
                'type' => $template->type,
                'code' => $template->code,
                'name' => $template->name,
            ])->values(),
            'activeUnits' => $activeUnitsQuery->get([
                'id',
                'period_id',
                'correlative',
                'plate_number',
                'driver_name',
                'provider',
                'category',
                'vehicle_type',
                'coordinator_id',
            ]),
            'offlineCatalog' => $templates->map(function (ChecklistTemplate $template) use ($paretoSync) {
                $weightTotal = $paretoSync->activeWeightTotal($template->type);

                return [
                    'id' => $template->id,
                    'type' => $template->type,
                    'code' => $template->code,
                    'name' => $template->name,
                    'version' => $template->version,
                    'notes_hint' => $template->notes_hint,
                    'items' => $template->items
                        ->sortBy(fn (ChecklistItem $item) => [$item->sort_order, $item->id])
                        ->values()
                        ->map(fn (ChecklistItem $item) => [
                            'id' => $item->id,
                            'parent_id' => $item->parent_id,
                            'item_number' => $item->item_number,
                            'label' => $item->label,
                            'sort_order' => $item->sort_order,
                            'has_expiry' => $item->resolvedCheckType() === ParetoCheckTypes::EXPIRY,
                            'check_type' => $item->resolvedCheckType(),
                            'weight' => $item->weight !== null ? (float) $item->weight : null,
                        ]),
                    'signatureRoles' => $template->signatureRoles
                        ->sortBy('sort_order')
                        ->values()
                        ->map(fn ($role) => [
                            'id' => $role->id,
                            'label' => $role->label,
                            'sort_order' => $role->sort_order,
                        ]),
                    'pareto' => [
                        'weight_total' => $weightTotal,
                        'weight_ok' => abs($weightTotal - 100) < 0.01,
                    ],
                ];
            })->values(),
            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
                'completed' => (clone $statsQuery)->where('status', 'completed')->count(),
                'page' => $checklists->currentPage().'/'.max($checklists->lastPage(), 1),
                'on_screen' => $checklists->count(),
            ],
        ]);
    }

    public function export(Request $request, InspectionDatabaseExporter $exporter): StreamedResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'template_type' => ['nullable', Rule::in(['tdp', 'tdc'])],
            'status' => ['nullable', Rule::in(['draft', 'completed'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $templateType = $validated['template_type'] ?? null;
        $status = $validated['status'] ?? null;
        [$dateFrom, $dateTo] = $this->inspectionDateRange($validated);

        $query = UnitChecklist::query()
            ->with([
                'template:id,type',
                'period:id,name,status',
                'unit.coordinatorUser.place.site',
                'unit.coordinatorUser.places.site',
                'unit.documents',
                'answers.item',
            ])
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('plate_number', 'ilike', "%{$search}%")
                    ->orWhere('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('provider', 'ilike', "%{$search}%");
            });
        }

        if ($templateType) {
            $query->whereHas('template', fn ($q) => $q->where('type', $templateType));
        }

        if ($status) {
            $query->where('status', $status);
        }

        $this->applyInspectionDateRange($query, $dateFrom, $dateTo);

        $checklists = $query
            ->orderBy('first_inspected_on')
            ->orderBy('id')
            ->get();

        $filename = 'inspecciones';

        if ($dateFrom || $dateTo) {
            $filename .= '-'.($dateFrom ?: 'inicio').'_a_'.($dateTo ?: now()->toDateString());
        } else {
            $filename .= '-'.now()->format('Y-m-d_His');
        }

        return $exporter->download($checklists, $filename.'.xlsx');
    }

    public function day(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $date = Carbon::parse($validated['date'])->toDateString();
        $groups = $this->dayGroups($date)->keyBy('id');
        $people = SystemRoles::coordinators();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $people = $people->where('id', Auth::id())->values();
        }

        $coordinators = $people->map(function ($user) use ($groups) {
            $group = $groups->get($user->id);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'plates' => is_array($group) ? $group['plates'] : [],
            ];
        })->values();

        $dates = UnitMovement::query()
            ->whereNotNull('unit_id')
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->select('service_date')
            ->distinct()
            ->orderByDesc('service_date')
            ->limit(8)
            ->pluck('service_date')
            ->map(fn ($value) => Carbon::parse($value)->toDateString())
            ->values();

        return response()->json([
            'date' => $date,
            'coordinators' => $coordinators,
            'dates' => $dates,
        ]);
    }

    public function storeDay(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'coordinator_id' => ['required', 'integer'],
            'unit_ids' => ['required', 'array', 'min:1'],
            'unit_ids.*' => ['integer'],
        ], [
            'date.required' => 'Elige la fecha de la inspección.',
            'coordinator_id.required' => 'Elige el coordinador.',
            'unit_ids.required' => 'Elige al menos una placa.',
            'unit_ids.min' => 'Elige al menos una placa.',
        ]);

        $date = Carbon::parse($validated['date'])->toDateString();
        $coordinatorId = (int) $validated['coordinator_id'];

        if (
            SystemRoles::currentIsScopedCoordinator()
            && $coordinatorId !== (int) Auth::id()
        ) {
            abort(403, 'Solo puedes crear inspecciones de tus unidades.');
        }

        $wanted = collect($validated['unit_ids'])->map(fn ($id) => (int) $id)->unique();
        $group = $this->dayGroups($date)->firstWhere('id', $coordinatorId);
        $plates = collect(is_array($group) ? $group['plates'] : [])
            ->filter(fn (array $plate) => $wanted->contains($plate['unit_id']) && $plate['status'] !== 'exists');

        if ($plates->isEmpty()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esas placas ya tienen inspección en esa fecha.',
            ]);
        }

        $created = 0;
        $attached = 0;
        $batch = null;

        DB::transaction(function () use ($plates, $date, $coordinatorId, &$created, &$attached, &$batch): void {
            foreach ($plates as $plate) {
                $result = $this->ensureChecklistForPlate($plate, $date);

                if ($result === 'created') {
                    $created++;
                } else {
                    $attached++;
                }
            }

            $batch = InspectionBatch::query()->firstOrCreate(
                [
                    'coordinator_id' => $coordinatorId,
                    'inspected_on' => $date,
                ],
                [
                    'status' => InspectionBatch::STATUS_DRAFT,
                    'sent_by' => Auth::id(),
                ],
            );

            UnitChecklist::query()
                ->whereIn('unit_id', $plates->pluck('unit_id'))
                ->whereDate('first_inspected_on', $date)
                ->update(['inspection_batch_id' => $batch->id]);
        });

        $label = Carbon::parse($date)->format('d/m/Y');
        $message = "{$created} inspecciones nuevas del {$label}.";

        if ($attached > 0) {
            $message .= " {$attached} ya existían y quedaron en esa fecha.";
        }

        return redirect()
            ->route('checklists.index', ['batch_id' => $batch?->id])
            ->with('toast', [
                'type' => 'success',
                'message' => $message,
            ]);
    }

    public function store(StoreUnitChecklistRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $unit = Unit::query()->with('period')->findOrFail($data['unit_id']);
        $this->ensureCanAccessUnit($unit);

        if ($unit->period?->status !== 'active') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Solo se pueden crear checklists de unidades en periodos activos.',
            ]);
        }

        $inspectedOn = Carbon::parse($data['inspected_on'])->toDateString();

        $existing = UnitChecklist::query()
            ->where('unit_id', $unit->id)
            ->where('template_id', $data['template_id'])
            ->where('period_id', $unit->period_id)
            ->whereDate('first_inspected_on', $inspectedOn)
            ->first();

        if ($existing) {
            return redirect()
                ->route('checklists.edit', $existing)
                ->with('toast', [
                    'type' => 'success',
                    'message' => 'Esa placa ya tiene inspección en esa fecha. Se abrió la existente.',
                ]);
        }

        $undated = UnitChecklist::query()
            ->where('unit_id', $unit->id)
            ->where('template_id', $data['template_id'])
            ->where('period_id', $unit->period_id)
            ->whereNull('first_inspected_on')
            ->first();

        if ($undated) {
            $undated->update(['first_inspected_on' => $inspectedOn]);

            return redirect()
                ->route('checklists.edit', $undated)
                ->with('toast', [
                    'type' => 'success',
                    'message' => 'Se abrió la inspección de esa placa.',
                ]);
        }

        try {
            $checklist = DB::transaction(function () use ($unit, $data, $inspectedOn) {
                $template = ChecklistTemplate::query()
                    ->with(['signatureRoles'])
                    ->findOrFail($data['template_id']);

                $items = app(ParetoChecklistSync::class)
                    ->syncForInspection($template->type);

                $checklist = UnitChecklist::query()->create([
                    'unit_id' => $unit->id,
                    'period_id' => $unit->period_id,
                    'template_id' => $template->id,
                    'created_by' => Auth::id(),
                    'plate_number' => $unit->plate_number ?: $unit->correlative,
                    'driver_name' => $unit->driver_name,
                    'provider' => $unit->provider,
                    'transport_company' => $unit->provider,
                    'license_class' => $unit->category,
                    'vehicle_info' => $unit->vehicle_type,
                    'first_inspected_on' => $inspectedOn,
                    'status' => 'draft',
                ]);

                foreach ($items as $item) {
                    UnitChecklistAnswer::query()->create([
                        'unit_checklist_id' => $checklist->id,
                        'checklist_item_id' => $item->id,
                    ]);
                }

                $this->ensurePassSignatures($checklist);

                return $checklist;
            });
        } catch (\RuntimeException $exception) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $exception->getMessage(),
            ]);
        }

        return redirect()
            ->route('checklists.edit', $checklist)
            ->with('toast', [
                'type' => 'success',
                'message' => 'Checklist creado. Completa la inspección.',
            ]);
    }

    public function edit(UnitChecklist $checklist): InertiaResponse|RedirectResponse
    {
        $checklist->load([
            'period:id,name,date,status',
            'unit:id,correlative,plate_number,driver_name,provider,category,period_id,coordinator_id',
            'template.signatureRoles',
            'answers.item',
            'signatures',
            'photos',
            'inspectionBatch:id,inspected_on,status,signer_name,signed_at',
        ]);

        $this->ensureCanAccessChecklist($checklist);

        if ($checklist->period?->status !== 'active') {
            return redirect()
                ->route('checklists.index')
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Este checklist pertenece a un periodo inactivo y no se puede editar.',
                ]);
        }

        $paretoMeta = [
            'weight_total' => 0.0,
            'weight_ok' => true,
        ];

        if ($checklist->template?->type) {
            $weightTotal = app(ParetoChecklistSync::class)
                ->activeWeightTotal($checklist->template->type);
            $paretoMeta = [
                'weight_total' => $weightTotal,
                'weight_ok' => abs($weightTotal - 100) < 0.01,
            ];
        }

        $items = $checklist->answers
            ->filter(fn (UnitChecklistAnswer $answer) => $answer->item !== null)
            ->sortBy(fn (UnitChecklistAnswer $answer) => [
                $answer->item->sort_order,
                $answer->item->id,
            ])
            ->values()
            ->map(function (UnitChecklistAnswer $answer) {
                /** @var ChecklistItem $item */
                $item = $answer->item;
                $checkType = $item->resolvedCheckType();

                return [
                    'id' => $item->id,
                    'parent_id' => $item->parent_id,
                    'item_number' => $item->item_number,
                    'label' => $item->label,
                    'sort_order' => $item->sort_order,
                    'has_expiry' => $checkType === ParetoCheckTypes::EXPIRY,
                    'check_type' => $checkType,
                    'weight' => $item->weight !== null ? (float) $item->weight : null,
                    'first_value' => $answer->first_value,
                    'second_value' => $answer->second_value,
                    'observations' => $answer->observations,
                ];
            })
            ->values();

        $this->ensurePassSignatures($checklist);
        $checklist->load('signatures');

        $signatures = $checklist->signatures
            ->filter(fn (UnitChecklistSignature $signature) => in_array($signature->slot, ['driver', 'sst'], true))
            ->sortBy(fn (UnitChecklistSignature $signature) => sprintf(
                '%s-%02d',
                $signature->inspection_pass === 'second' ? '2' : '1',
                array_search($signature->slot, ['driver', 'sst'], true) ?: 0,
            ))
            ->values()
            ->map(fn (UnitChecklistSignature $signature) => [
                'signature_role_id' => $signature->id,
                'slot' => $signature->slot,
                'inspection_pass' => $signature->inspection_pass,
                'label' => $this->signatureSlotLabel((string) $signature->slot),
                'signer_name' => $signature->signer_name,
                'signature_url' => $signature->signatureUrl(),
                'signed_at' => $signature->signed_at
                    ?->timezone(config('app.timezone'))
                    ->format('d/m/Y H:i'),
            ]);

        $driverOptions = UnitMovement::query()
            ->where('unit_id', $checklist->unit_id)
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '')
            ->orderBy('service_date')
            ->orderBy('driver_name')
            ->get(['service_date', 'driver_name'])
            ->unique(fn (UnitMovement $movement) => $movement->service_date->format('Y-m-d').'|'.mb_strtoupper($movement->driver_name))
            ->map(fn (UnitMovement $movement) => [
                'date' => $movement->service_date->format('Y-m-d'),
                'name' => $movement->driver_name,
            ])
            ->values();

        return Inertia::render('checklists/edit', [
            'checklist' => [
                'id' => $checklist->id,
                'status' => $checklist->status,
                'sealed_at' => optional($checklist->sealed_at)?->toIso8601String(),
                'is_sealed' => $checklist->isSealed(),
                'plate_number' => $checklist->plate_number,
                'driver_name' => $checklist->driver_name,
                'driver_options' => $driverOptions,
                'provider' => $checklist->provider,
                'location' => $checklist->location,
                'transport_company' => $checklist->transport_company,
                'vehicle_info' => $checklist->vehicle_info,
                'license_number' => $checklist->license_number,
                'license_class' => $checklist->license_class,
                'license_revalidation_on' => optional($checklist->license_revalidation_on)?->format('Y-m-d'),
                'first_inspected_on' => optional($checklist->first_inspected_on)?->format('Y-m-d'),
                'first_inspected_time' => $checklist->first_inspected_time
                    ? substr((string) $checklist->first_inspected_time, 0, 5)
                    : null,
                'second_inspected_on' => optional($checklist->second_inspected_on)?->format('Y-m-d'),
                'second_inspected_time' => $checklist->second_inspected_time
                    ? substr((string) $checklist->second_inspected_time, 0, 5)
                    : null,
                'first_result' => $checklist->first_result,
                'second_result' => $checklist->second_result,
                'additional_observations' => $checklist->additional_observations,
                'coordinator_status' => $checklist->coordinator_status,
                'sent_to_coordinator_at' => optional($checklist->sent_to_coordinator_at)?->toIso8601String(),
                'coordinator_action_plan' => $checklist->coordinator_action_plan,
                'can_send_to_coordinator' => $checklist->canSendToCoordinator(),
                'can_start_second' => $checklist->canStartSecondInspection(),
                'inspection_batch' => $checklist->inspectionBatch ? [
                    'id' => $checklist->inspectionBatch->id,
                    'inspected_on' => $checklist->inspectionBatch->inspected_on->format('Y-m-d'),
                    'status' => $checklist->inspectionBatch->status,
                    'signer_name' => $checklist->inspectionBatch->signer_name,
                    'signed_at' => optional($checklist->inspectionBatch->signed_at)?->toIso8601String(),
                ] : null,
                'period' => $checklist->period,
                'unit' => $checklist->unit,
                'template' => [
                    'id' => $checklist->template->id,
                    'type' => $checklist->template->type,
                    'code' => $checklist->template->code,
                    'name' => $checklist->template->name,
                    'version' => $checklist->template->version,
                    'notes_hint' => $checklist->template->notes_hint,
                ],
                'items' => $items,
                'pareto' => $paretoMeta,
                'signatures' => $signatures,
                'photos' => $checklist->photos->map(fn (UnitChecklistPhoto $photo) => [
                    'id' => $photo->id,
                    'inspection_pass' => $photo->inspection_pass,
                    'checklist_item_id' => $photo->checklist_item_id,
                    'url' => $photo->url(),
                    'captured_at' => optional($photo->captured_at)?->timezone(config('app.timezone'))->format('d/m/Y H:i:s'),
                    'latitude' => $photo->latitude,
                    'longitude' => $photo->longitude,
                    'accuracy' => $photo->accuracy,
                ])->values(),
            ],
        ]);
    }

    public function update(UpdateUnitChecklistRequest $request, UnitChecklist $checklist): RedirectResponse
    {
        $checklist->loadMissing(['period', 'unit', 'signatures', 'template.signatureRoles']);
        $this->ensureCanAccessChecklist($checklist);
        $this->pinChecklistRedirect($request, $checklist);

        if ($checklist->period?->status !== 'active') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede editar un checklist de un periodo inactivo.',
            ]);
        }

        if ($checklist->isSealed()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esta inspección ya está sellada y no se puede editar.',
            ]);
        }

        $data = $request->validated();
        $shouldSeal = (bool) ($data['seal'] ?? false);
        $firstAlreadyDecided = $checklist->hasFirstInspectionDecision();
        $firstAlreadyApproved = $checklist->first_result === 'approved';
        $secondAlreadyApproved = $checklist->second_result === 'approved';

        try {
            $this->assertApprovalPayload($checklist, $data, $firstAlreadyApproved, $secondAlreadyApproved);

            DB::transaction(function () use ($checklist, $data, $shouldSeal, $firstAlreadyDecided, $firstAlreadyApproved, $secondAlreadyApproved): void {
                $incomingFirstResult = $data['first_result'] ?? null;
                $incomingSecondResult = $data['second_result'] ?? null;

                // 1ra bloqueada al aprobar o desaprobar. La 2da sigue en la misma fecha.
                $firstResult = $firstAlreadyDecided
                    ? $checklist->first_result
                    : $incomingFirstResult;
                $secondAllowed = in_array($firstResult, ['approved', 'rejected'], true)
                    && ! $checklist->isSealed();
                $secondResult = ! $secondAllowed
                    ? null
                    : ($secondAlreadyApproved
                        ? $checklist->second_result
                        : $incomingSecondResult);

                if (($incomingSecondResult ?? null) && ! $secondAllowed) {
                    throw new \RuntimeException(
                        'Cierra la 1ra inspección (aprobar o desaprobar) antes de la 2da.'
                    );
                }

                $checklist->update([
                    'location' => $data['location'] ?? null,
                    'transport_company' => $data['transport_company'] ?? null,
                    'vehicle_info' => $data['vehicle_info'] ?? null,
                    'license_number' => $data['license_number'] ?? null,
                    'license_class' => $data['license_class'] ?? null,
                    'license_revalidation_on' => $data['license_revalidation_on'] ?? null,
                    'driver_name' => $data['driver_name'] ?? null,
                    'first_inspected_on' => $firstAlreadyDecided
                        ? $checklist->first_inspected_on
                        : ($data['first_inspected_on'] ?? null),
                    'first_inspected_time' => $firstAlreadyDecided
                        ? $checklist->first_inspected_time
                        : ($data['first_inspected_time'] ?? null),
                    'second_inspected_on' => ! $secondAllowed
                        ? null
                        : ($secondAlreadyApproved
                            ? $checklist->second_inspected_on
                            : ($data['second_inspected_on'] ?? null)),
                    'second_inspected_time' => ! $secondAllowed
                        ? null
                        : ($secondAlreadyApproved
                            ? $checklist->second_inspected_time
                            : ($data['second_inspected_time'] ?? null)),
                    'first_result' => $firstResult,
                    'second_result' => $secondResult,
                    'additional_observations' => $data['additional_observations'] ?? null,
                    'status' => $shouldSeal ? 'completed' : ($data['status'] ?? $checklist->status),
                    'sealed_at' => $shouldSeal ? now() : $checklist->sealed_at,
                ]);

                foreach ($data['answers'] ?? [] as $answer) {
                    // En standby (1ra cerrada, esperando coordinador) no se tocan respuestas.
                    if ($firstAlreadyDecided && ! $secondAllowed) {
                        continue;
                    }

                    $payload = [];

                    if (! $firstAlreadyDecided && array_key_exists('first_value', $answer)) {
                        $payload['first_value'] = $answer['first_value'] ?? null;
                        $payload['observations'] = $answer['observations'] ?? null;
                    }

                    if (
                        $secondAllowed
                        && ! $secondAlreadyApproved
                        && array_key_exists('second_value', $answer)
                    ) {
                        $payload['second_value'] = $answer['second_value'] ?? null;
                        $payload['observations'] = $answer['observations'] ?? null;
                    }

                    if ($payload === []) {
                        continue;
                    }

                    UnitChecklistAnswer::query()
                        ->where('unit_checklist_id', $checklist->id)
                        ->where('checklist_item_id', $answer['checklist_item_id'])
                        ->update($payload);
                }

                foreach ($data['signatures'] ?? [] as $signatureData) {
                    $signatureQuery = UnitChecklistSignature::query()
                        ->where('unit_checklist_id', $checklist->id);

                    if (! empty($signatureData['slot'])) {
                        $signature = $signatureQuery
                            ->where('slot', $signatureData['slot'])
                            ->where('inspection_pass', $signatureData['inspection_pass'] ?? 'first')
                            ->first();
                    } else {
                        $signature = $signatureQuery
                            ->where('signature_role_id', $signatureData['signature_role_id'])
                            ->whereNull('slot')
                            ->first();
                    }

                    if (! $signature) {
                        continue;
                    }

                    $updates = [
                        'signer_name' => $signatureData['signer_name'] ?? null,
                    ];

                    if (! empty($signatureData['clear_signature'])) {
                        $signature->deleteSignatureFile();
                        $updates['signature_path'] = null;
                        $updates['signed_at'] = null;
                    } elseif (! empty($signatureData['signature_data_url'])) {
                        $signature->deleteSignatureFile();
                        $updates['signature_path'] = \App\Support\SignatureImage::storeFromDataUrl(
                            $signatureData['signature_data_url'],
                            "checklists/{$checklist->id}/signatures",
                        );
                        $updates['signed_at'] = now();
                    }

                    $signature->update($updates);
                }

                if ($shouldSeal) {
                    $checklist->refresh();

                    if ($checklist->first_result !== 'approved' || $checklist->second_result !== 'approved') {
                        throw new \RuntimeException('Para sellar, la 1ra y 2da inspección deben estar aprobadas.');
                    }
                }
            });
        } catch (\RuntimeException $exception) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $exception->getMessage(),
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => $shouldSeal
                ? 'Inspección sellada correctamente. Ya no se puede editar.'
                : 'Checklist guardado correctamente.',
        ]);
    }

    public function storePhoto(Request $request, UnitChecklist $checklist): JsonResponse|RedirectResponse
    {
        $checklist->loadMissing(['period', 'unit']);
        $this->ensureCanAccessChecklist($checklist);
        $this->pinChecklistRedirect($request, $checklist);

        if ($checklist->period?->status !== 'active') {
            return $this->checklistToast($request, $checklist, 'error', 'No se pueden subir fotos en un periodo inactivo.');
        }

        if ($checklist->isSealed()) {
            return $this->checklistToast($request, $checklist, 'error', 'Esta inspección está sellada. No se pueden agregar fotos.');
        }

        $validated = $request->validate([
            'inspection_pass' => ['required', Rule::in(['first', 'second'])],
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
            'captured_at' => ['nullable', 'date'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
            'checklist_item_id' => ['nullable', 'integer'],
        ], [
            'photo.required' => 'Debes tomar o seleccionar una foto.',
            'photo.image' => 'El archivo debe ser una imagen.',
            'photo.max' => 'La foto no puede superar los 10 MB.',
            'inspection_pass.required' => 'Indica si es 1ra o 2da inspección.',
        ]);

        $file = $request->file('photo');
        $pass = $validated['inspection_pass'];
        $itemId = $this->evidenceItemId($request, $checklist);

        if ($itemId === false) {
            return $this->checklistToast($request, $checklist, 'error', 'Este ítem no admite foto de evidencia.');
        }

        if ($pass === 'second' && ! $checklist->canStartSecondInspection()) {
            return $this->checklistToast($request, $checklist, 'error', 'La 2da inspección se habilita cuando la 1ra está aprobada o desaprobada.');
        }

        if ($itemId !== null) {
            $previous = UnitChecklistPhoto::query()
                ->where('unit_checklist_id', $checklist->id)
                ->where('checklist_item_id', $itemId)
                ->where('inspection_pass', $pass)
                ->get();

            foreach ($previous as $old) {
                Storage::disk($old->disk)->delete($old->path);
                $old->delete();
            }
        }

        $directory = $itemId
            ? "checklists/{$checklist->id}/{$pass}/items/{$itemId}"
            : "checklists/{$checklist->id}/{$pass}";
        $path = $file->store($directory, 'public');

        $photo = UnitChecklistPhoto::query()->create([
            'unit_checklist_id' => $checklist->id,
            'checklist_item_id' => $itemId,
            'inspection_pass' => $pass,
            'path' => $path,
            'disk' => 'public',
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'captured_at' => $validated['captured_at'] ?? now(),
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'accuracy' => $validated['accuracy'] ?? null,
            'uploaded_by' => Auth::id(),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Foto subida.',
                'photo' => [
                    'id' => $photo->id,
                    'checklist_item_id' => $photo->checklist_item_id,
                    'inspection_pass' => $photo->inspection_pass,
                    'url' => $photo->url(),
                ],
            ]);
        }

        return $this->checklistToast(
            $request,
            $checklist,
            'success',
            $pass === 'first'
                ? 'Foto de la 1ra inspección subida.'
                : 'Foto de la 2da inspección subida.',
        );
    }

    public function destroyPhoto(UnitChecklist $checklist, UnitChecklistPhoto $photo): JsonResponse|RedirectResponse
    {
        if ($photo->unit_checklist_id !== $checklist->id) {
            abort(404);
        }

        $checklist->loadMissing(['period', 'unit']);
        $this->ensureCanAccessChecklist($checklist);
        $this->pinChecklistRedirect(request(), $checklist);

        if ($checklist->period?->status !== 'active') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se pueden eliminar fotos de un periodo inactivo.',
            ]);
        }

        if ($checklist->isSealed()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esta inspección está sellada. No se pueden eliminar fotos.',
            ]);
        }

        Storage::disk($photo->disk)->delete($photo->path);
        $photo->delete();

        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Foto eliminada correctamente.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Foto eliminada correctamente.',
        ]);
    }

    /**
     * @return int|null|false null cuando no es evidencia, false si el ítem no está permitido
     */
    private function evidenceItemId(Request $request, UnitChecklist $checklist): int|null|false
    {
        if (! $request->filled('checklist_item_id')) {
            return null;
        }

        $item = ChecklistItem::query()->find($request->integer('checklist_item_id'));
        $checklist->loadMissing('template');
        $allowed = ['13', '14', '19', '21', '26', '30'];

        if (
            ! $item
            || (int) $item->template_id !== (int) $checklist->template_id
            || $checklist->template?->type !== 'tdp'
            || ! in_array((string) $item->item_number, $allowed, true)
        ) {
            return false;
        }

        return $item->id;
    }

    public function pdf(Request $request, UnitChecklist $checklist): Response|RedirectResponse
    {
        $checklist->loadMissing('unit');
        $this->ensureCanAccessChecklist($checklist);

        if (! $checklist->canPreviewConsolidatedPdf()) {
            return redirect()
                ->route('checklists.index')
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'El PDF consolidado está disponible cuando la 1ra inspección está aprobada o desaprobada.',
                ]);
        }

        $checklist->load([
            'period:id,name,date,status',
            'template.signatureRoles',
            'answers.item',
            'signatures',
            'photos',
            'inspectionBatch',
        ]);

        $scored = 0.0;
        $catalog = 0.0;

        $rows = $checklist->answers
            ->filter(fn (UnitChecklistAnswer $answer) => $answer->item !== null)
            ->sortBy(fn (UnitChecklistAnswer $answer) => [
                $answer->item->sort_order,
                $answer->item->id,
            ])
            ->values()
            ->map(function (UnitChecklistAnswer $answer) use (&$scored, &$catalog) {
                $item = $answer->item;
                $weight = (float) ($item->weight ?? 0);
                $catalog += $weight;

                if ($answer->first_value === 'yes') {
                    $scored += $weight;
                }

                return [
                    'checklist_item_id' => $item->id,
                    'item_number' => $item->item_number,
                    'label' => $item->label,
                    'is_child' => $item->parent_id !== null,
                    'first_value' => $answer->first_value,
                    'second_value' => $answer->second_value,
                    'observations' => $answer->observations,
                    'weight' => $weight,
                ];
            });

        $toDataUri = static function (?string $absolute): ?string {
            if (! $absolute || ! is_file($absolute)) {
                return null;
            }

            $mime = mime_content_type($absolute) ?: 'image/png';
            $binary = file_get_contents($absolute);

            if ($binary === false || $binary === '') {
                return null;
            }

            return 'data:'.$mime.';base64,'.base64_encode($binary);
        };

        $this->ensurePassSignatures($checklist);
        $checklist->unsetRelation('signatures');
        $checklist->load('signatures');

        $signatures = $checklist->signatures
            ->filter(fn (UnitChecklistSignature $signature) => in_array($signature->slot, ['driver', 'sst'], true))
            ->sortBy(fn (UnitChecklistSignature $signature) => sprintf(
                '%s-%02d',
                $signature->inspection_pass === 'second' ? '2' : '1',
                array_search($signature->slot, ['driver', 'sst'], true) ?: 0,
            ))
            ->values()
            ->map(function (UnitChecklistSignature $signature) use ($toDataUri) {
                $image = $signature->signature_path
                    ? $toDataUri(Storage::disk('public')->path($signature->signature_path))
                    : null;
                $pass = $signature->inspection_pass === 'second' ? '2da' : '1ra';

                return [
                    'label' => $pass.' · '.$this->signatureSlotLabel((string) $signature->slot),
                    'signer_name' => $signature->signer_name,
                    'image_src' => $image,
                    'signed_at' => $signature->signed_at
                        ?->timezone(config('app.timezone'))
                        ->format('d/m/Y H:i'),
                ];
            });

        $evidenceByItem = [];
        $photos = collect();

        foreach ($checklist->photos as $photo) {
            $absolute = Storage::disk($photo->disk)->path($photo->path);
            $imageSrc = $toDataUri($absolute);

            if ($photo->checklist_item_id) {
                $pass = $photo->inspection_pass === 'second' ? 'second' : 'first';
                $evidenceByItem[$photo->checklist_item_id][$pass] = $imageSrc;

                continue;
            }

            $photos->push((object) [
                'inspection_pass' => $photo->inspection_pass,
                'captured_at' => $photo->captured_at,
                'latitude' => $photo->latitude,
                'longitude' => $photo->longitude,
                'image_src' => $imageSrc,
            ]);
        }

        $rows = $rows->map(function (array $row) use ($evidenceByItem) {
            $evidence = $evidenceByItem[$row['checklist_item_id']] ?? [];
            $row['evidence_first'] = $evidence['first'] ?? null;
            $row['evidence_second'] = $evidence['second'] ?? null;

            return $row;
        });

        $paretoChart = ParetoPieChart::build($scored, $catalog > 0 ? $catalog : 100);

        $coordinatorSignatureSrc = $checklist->coordinator_signature_path
            ? $toDataUri(Storage::disk('public')->path($checklist->coordinator_signature_path))
            : null;

        if ($checklist->inspectionBatch?->isSigned()) {
            $batch = $checklist->inspectionBatch;
            $batchImage = $batch->signature_path
                ? $toDataUri(Storage::disk('public')->path($batch->signature_path))
                : null;

            $signatures->push([
                'label' => 'Firma del coordinador',
                'signer_name' => $batch->signer_name,
                'image_src' => $batchImage,
                'signed_at' => $batch->signed_at
                    ?->timezone(config('app.timezone'))
                    ->format('d/m/Y H:i'),
            ]);
        }

        $type = strtoupper((string) ($checklist->template->type ?? 'INS'));
        $plate = preg_replace('/[^A-Za-z0-9\-_]/', '', (string) $checklist->plate_number) ?: 'placa';
        $filename = "inspeccion-{$type}-{$plate}-{$checklist->id}.pdf";

        $pdf = Pdf::loadView('pdfs.checklist-report', [
            'checklist' => $checklist,
            'rows' => $rows,
            'signatures' => $signatures,
            'photos' => $photos,
            'logoSrc' => PdfLogo::dataUri(),
            'paretoChart' => $paretoChart,
            'coordinatorSignatureSrc' => $coordinatorSignatureSrc,
        ])->setPaper('a4', 'portrait');

        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }

    public function destroy(Request $request, UnitChecklist $checklist): RedirectResponse
    {
        $checklist->loadMissing('unit');
        $this->ensureCanAccessChecklist($checklist);

        if ($checklist->isSealed()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar una inspección sellada.',
            ]);
        }

        $checklist->load('photos');

        foreach ($checklist->photos as $photo) {
            Storage::disk($photo->disk)->delete($photo->path);
        }

        $checklist->delete();

        return IndexedRedirect::toIndex($request, 'checklists.index', [
            'type' => 'success',
            'message' => 'Checklist eliminado correctamente.',
        ]);
    }

    /**
     * Valida respuestas al aprobar 1ra/2da (completas, SÍ, observação en expiry).
     *
     * @param  array<string, mixed>  $data
     */
    private function assertApprovalPayload(
        UnitChecklist $checklist,
        array $data,
        bool $firstAlreadyApproved,
        bool $secondAlreadyApproved,
    ): void {
        $incomingFirst = $data['first_result'] ?? null;
        $incomingSecond = $data['second_result'] ?? null;
        $answers = collect($data['answers'] ?? []);

        if ($incomingFirst === 'approved' && ! $firstAlreadyApproved) {
            $this->assertPassAnswersReady($checklist, $answers, 'first');
        }

        if ($incomingSecond === 'approved' && ! $secondAlreadyApproved) {
            $firstReady = $checklist->hasFirstInspectionDecision()
                || in_array($incomingFirst, ['approved', 'rejected'], true);

            if (! $firstReady) {
                throw new \RuntimeException('Debes cerrar la 1ra inspección (aprobar o desaprobar) antes de la 2da.');
            }

            $this->assertPassAnswersReady($checklist, $answers, 'second');
        }
    }

    public function sendToCoordinator(Request $request, UnitChecklist $checklist): RedirectResponse
    {
        return back()->with('toast', [
            'type' => 'error',
            'message' => 'El coordinador recibe el paquete del día. Ciérralo en Inspecciones → Enviar paquete.',
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $answers
     */
    private function assertPassAnswersReady(
        UnitChecklist $checklist,
        $answers,
        string $pass,
    ): void {
        $valueKey = $pass === 'first' ? 'first_value' : 'second_value';
        $passLabel = $pass === 'first' ? '1ra' : '2da';

        $expectedIds = $checklist->answers()->pluck('checklist_item_id')->all();
        $byItem = $answers->keyBy('checklist_item_id');

        $items = ChecklistItem::query()
            ->whereIn('id', $expectedIds)
            ->get()
            ->keyBy('id');

        $scored = 0.0;
        $catalog = 0.0;

        foreach ($expectedIds as $itemId) {
            $answer = $byItem->get($itemId);
            $item = $items->get($itemId);
            $label = $item?->item_number
                ? "{$item->item_number}. {$item->label}"
                : "Ítem #{$itemId}";

            $value = $answer[$valueKey] ?? null;
            $weight = (float) ($item?->weight ?? 0);
            $catalog += $weight;

            if ($value === null || $value === '') {
                throw new \RuntimeException(
                    "Para aprobar la {$passLabel} inspección debes marcar SÍ/NO en todos los ítems. Falta: {$label}."
                );
            }

            if ($value === 'yes') {
                $scored += $weight;
            }

            $checkType = $item?->resolvedCheckType() ?? ParetoCheckTypes::OBSERVATION;
            $observation = trim((string) ($answer['observations'] ?? ''));

            if ($checkType === ParetoCheckTypes::EXPIRY && $observation === '') {
                throw new \RuntimeException(
                    "El ítem «{$label}» requiere vencimiento / observación antes de aprobar."
                );
            }
        }

        $total = $catalog > 0 ? $catalog : 100.0;
        $percent = $total > 0 ? round(($scored / $total) * 100, 2) : 0.0;

        if (! ParetoPassThreshold::passes($percent)) {
            $min = ParetoPassThreshold::MIN_PERCENT;
            throw new \RuntimeException(
                "Para aprobar la {$passLabel} inspección el Pareto debe ser ≥ {$min}% (actual: {$percent}%)."
            );
        }
    }

    /**
     * @return Collection<int, array{id: int, name: string, plates: list<array<string, mixed>>}>
     */
    private function dayGroups(string $date): Collection
    {
        $query = Unit::query()
            ->with('coordinatorUser:id,name')
            ->whereNotNull('coordinator_id')
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        $units = $query
            ->orderBy('plate_number')
            ->orderBy('id')
            ->get();

        $movements = UnitMovement::query()
            ->whereDate('service_date', $date)
            ->whereIn('unit_id', $units->pluck('id'))
            ->orderByDesc('id')
            ->get()
            ->unique('unit_id')
            ->keyBy('unit_id');

        $templates = ChecklistTemplate::query()
            ->where('is_active', true)
            ->get()
            ->keyBy('type');

        $byCoordinator = [];

        foreach ($units as $unit) {
            $coordinatorId = (int) $unit->coordinator_id;

            if ($coordinatorId === 0) {
                continue;
            }

            if (! isset($byCoordinator[$coordinatorId])) {
                $byCoordinator[$coordinatorId] = [
                    'id' => $coordinatorId,
                    'name' => (string) ($unit->coordinatorUser?->name ?? 'Coordinador'),
                    'rows' => [],
                ];
            }

            $byCoordinator[$coordinatorId]['rows'][$unit->id] = $unit;
        }

        $existing = UnitChecklist::query()
            ->whereIn('unit_id', $units->pluck('id'))
            ->get(['id', 'unit_id', 'template_id', 'period_id', 'first_inspected_on']);

        return collect($byCoordinator)
            ->sortBy('name')
            ->map(function (array $group) use ($templates, $existing, $movements, $date) {
                $plates = [];

                foreach ($group['rows'] as $unit) {
                    $movement = $movements->get($unit->id);
                    $type = $this->templateTypeForVehicle($movement?->vehicle_type ?: $unit->vehicle_type);
                    $template = $templates->get($type);

                    if (! $template) {
                        continue;
                    }

                    $periodId = (int) $unit->period_id;
                    $sameDay = $existing->first(function (UnitChecklist $checklist) use ($unit, $template, $periodId, $date) {
                        return (int) $checklist->unit_id === (int) $unit->id
                            && (int) $checklist->template_id === (int) $template->id
                            && (int) $checklist->period_id === $periodId
                            && $checklist->first_inspected_on?->toDateString() === $date;
                    });

                    $plates[] = [
                        'unit_id' => (int) $unit->id,
                        'period_id' => $periodId,
                        'plate' => (string) ($movement?->plate_number ?: $unit->plate_number ?: $unit->correlative),
                        'driver' => $movement?->driver_name ?: $unit->driver_name,
                        'provider' => $movement?->provider ?: $unit->provider,
                        'vehicle_type' => $movement?->vehicle_type ?: $unit->vehicle_type,
                        'category' => $movement?->category ?: $unit->category,
                        'template_type' => $type,
                        'template_id' => (int) $template->id,
                        'status' => $sameDay ? 'exists' : 'new',
                    ];
                }

                return [
                    'id' => $group['id'],
                    'name' => $group['name'],
                    'plates' => $plates,
                ];
            })
            ->filter(fn (array $group) => $group['plates'] !== [])
            ->values();
    }

    /**
     * @param  array<string, mixed>  $plate
     */
    private function ensureChecklistForPlate(array $plate, string $date): string
    {
        $existing = UnitChecklist::query()
            ->where('unit_id', $plate['unit_id'])
            ->where('template_id', $plate['template_id'])
            ->where('period_id', $plate['period_id'])
            ->whereDate('first_inspected_on', $date)
            ->first();

        if ($existing) {
            return 'exists';
        }

        $undated = UnitChecklist::query()
            ->where('unit_id', $plate['unit_id'])
            ->where('template_id', $plate['template_id'])
            ->where('period_id', $plate['period_id'])
            ->whereNull('first_inspected_on')
            ->first();

        if ($undated) {
            $undated->update([
                'first_inspected_on' => $date,
                'driver_name' => $undated->driver_name ?: $plate['driver'],
                'provider' => $undated->provider ?: $plate['provider'],
                'vehicle_info' => $undated->vehicle_info ?: $plate['vehicle_type'],
            ]);

            return 'attached';
        }

        $unit = Unit::query()->findOrFail($plate['unit_id']);
        $template = ChecklistTemplate::query()
            ->with('signatureRoles')
            ->findOrFail($plate['template_id']);
        $items = app(ParetoChecklistSync::class)->syncForInspection($template->type);

        $checklist = UnitChecklist::query()->create([
            'unit_id' => $unit->id,
            'period_id' => $plate['period_id'],
            'template_id' => $template->id,
            'created_by' => Auth::id(),
            'plate_number' => $plate['plate'],
            'driver_name' => $plate['driver'],
            'provider' => $plate['provider'],
            'transport_company' => $plate['provider'],
            'vehicle_info' => $plate['vehicle_type'],
            'license_class' => $plate['category'],
            'first_inspected_on' => $date,
            'status' => 'draft',
        ]);

        foreach ($items as $item) {
            UnitChecklistAnswer::query()->create([
                'unit_checklist_id' => $checklist->id,
                'checklist_item_id' => $item->id,
            ]);
        }

        $this->ensurePassSignatures($checklist);

        return 'created';
    }

    private function templateTypeForVehicle(?string $vehicleType): string
    {
        $value = mb_strtoupper(trim((string) $vehicleType));

        if (
            str_contains($value, 'CAMIONETA')
            || str_contains($value, 'PICK')
            || $value === 'TDC'
        ) {
            return 'tdc';
        }

        return 'tdp';
    }

    /**
     * @return array<string, string>
     */
    private function signatureSlots(): array
    {
        return [
            'driver' => 'Firma del conductor',
            'sst' => 'V°B° SST',
        ];
    }

    private function signatureSlotLabel(string $slot): string
    {
        return $this->signatureSlots()[$slot] ?? $slot;
    }

    private function ensurePassSignatures(UnitChecklist $checklist): void
    {
        foreach (['first', 'second'] as $pass) {
            foreach (array_keys($this->signatureSlots()) as $slot) {
                UnitChecklistSignature::query()->firstOrCreate(
                    [
                        'unit_checklist_id' => $checklist->id,
                        'inspection_pass' => $pass,
                        'slot' => $slot,
                    ],
                    [
                        'signer_name' => $slot === 'driver' ? $checklist->driver_name : null,
                    ],
                );
            }
        }
    }

    private function attachLooseChecklists(): void
    {
        $loose = UnitChecklist::query()
            ->with('unit:id,coordinator_id')
            ->whereNull('inspection_batch_id')
            ->get();

        foreach ($loose as $checklist) {
            $coordinatorId = (int) ($checklist->unit?->coordinator_id ?? 0);

            if ($coordinatorId === 0) {
                $coordinatorId = (int) UnitMovement::query()
                    ->where('unit_id', $checklist->unit_id)
                    ->whereNotNull('coordinator_id')
                    ->orderByDesc('service_date')
                    ->value('coordinator_id');
            }

            if ($coordinatorId === 0) {
                continue;
            }

            $date = $checklist->first_inspected_on?->toDateString();

            if ($date === null) {
                $movementDate = UnitMovement::query()
                    ->where('unit_id', $checklist->unit_id)
                    ->orderByDesc('service_date')
                    ->value('service_date');
                $date = $movementDate
                    ? Carbon::parse($movementDate)->toDateString()
                    : $checklist->created_at?->toDateString();
            }

            if ($date === null) {
                continue;
            }

            $batch = InspectionBatch::query()->firstOrCreate(
                [
                    'coordinator_id' => $coordinatorId,
                    'inspected_on' => $date,
                ],
                [
                    'status' => InspectionBatch::STATUS_DRAFT,
                ],
            );

            $checklist->update(['inspection_batch_id' => $batch->id]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: ?string, 1: ?string}
     */
    private function inspectionDateRange(array $validated): array
    {
        $from = isset($validated['date_from']) ? (string) $validated['date_from'] : null;
        $to = isset($validated['date_to']) ? (string) $validated['date_to'] : null;

        if ($from === '') {
            $from = null;
        }

        if ($to === '') {
            $to = null;
        }

        if ($from !== null && $to !== null && $from > $to) {
            return [$to, $from];
        }

        return [$from, $to];
    }

    private function applyInspectionDateRange(mixed $query, ?string $from, ?string $to): void
    {
        if ($from) {
            $query->whereDate('first_inspected_on', '>=', $from);
        }

        if ($to) {
            $query->whereDate('first_inspected_on', '<=', $to);
        }
    }

    private function pinChecklistRedirect(Request $request, UnitChecklist $checklist): void
    {
        $request->headers->set('referer', route('checklists.edit', $checklist));
    }

    private function checklistToast(Request $request, UnitChecklist $checklist, string $type, string $message): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson()) {
            return response()->json(
                ['message' => $message],
                $type === 'success' ? 200 : 422,
            );
        }

        $this->pinChecklistRedirect($request, $checklist);

        return back()->with('toast', [
            'type' => $type,
            'message' => $message,
        ]);
    }

    private function ensureCanAccessUnit(Unit $unit): void
    {
        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $unit->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a esta unidad.');
        }
    }

    private function ensureCanAccessChecklist(UnitChecklist $checklist): void
    {
        if (! SystemRoles::currentIsScopedCoordinator()) {
            return;
        }

        $coordinatorId = $checklist->unit?->coordinator_id
            ?? Unit::query()->whereKey($checklist->unit_id)->value('coordinator_id');

        if ((int) $coordinatorId !== (int) Auth::id()) {
            abort(403, 'No tienes acceso a esta inspección.');
        }
    }
}
