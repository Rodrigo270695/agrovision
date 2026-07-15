<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUnitChecklistRequest;
use App\Http\Requests\UpdateUnitChecklistRequest;
use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use App\Models\UnitChecklistPhoto;
use App\Models\UnitChecklistSignature;
use App\Services\ParetoChecklistSync;
use App\Services\PushNotificationService;
use App\Support\IndexedRedirect;
use App\Support\ParetoCheckTypes;
use App\Support\ParetoPieChart;
use App\Support\PdfLogo;
use App\Support\PermissionCatalog;
use App\Support\SystemRoles;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
            'sort' => ['nullable', Rule::in(['plate_number', 'created_at', 'status', 'first_result'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        PermissionCatalog::syncToDatabase();

        $search = trim((string) ($validated['search'] ?? ''));
        $templateType = $validated['template_type'] ?? null;
        $status = $validated['status'] ?? null;
        $sort = $validated['sort'] ?? 'created_at';
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

        $query->orderBy($sort, $direction);

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

        return Inertia::render('checklists/index', [
            'checklists' => $checklists,
            'filters' => [
                'search' => $search,
                'template_type' => $templateType,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'templates' => ChecklistTemplate::query()
                ->where('is_active', true)
                ->orderBy('type')
                ->get(['id', 'type', 'code', 'name']),
            'activeUnits' => $activeUnitsQuery->get([
                'id',
                'period_id',
                'correlative',
                'plate_number',
                'driver_name',
                'provider',
                'category',
                'coordinator_id',
            ]),
            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'draft' => (clone $statsQuery)->where('status', 'draft')->count(),
                'completed' => (clone $statsQuery)->where('status', 'completed')->count(),
                'page' => $checklists->currentPage().'/'.max($checklists->lastPage(), 1),
                'on_screen' => $checklists->count(),
            ],
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

        $existing = UnitChecklist::query()
            ->where('unit_id', $unit->id)
            ->where('template_id', $data['template_id'])
            ->where('period_id', $unit->period_id)
            ->first();

        if ($existing) {
            return redirect()
                ->route('checklists.edit', $existing)
                ->with('toast', [
                    'type' => 'success',
                    'message' => 'Ya existe un checklist para esa placa en el periodo. Se abrió el existente.',
                ]);
        }

        try {
            $checklist = DB::transaction(function () use ($unit, $data) {
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
                    'status' => 'draft',
                ]);

                foreach ($items as $item) {
                    UnitChecklistAnswer::query()->create([
                        'unit_checklist_id' => $checklist->id,
                        'checklist_item_id' => $item->id,
                    ]);
                }

                foreach ($template->signatureRoles as $role) {
                    UnitChecklistSignature::query()->create([
                        'unit_checklist_id' => $checklist->id,
                        'signature_role_id' => $role->id,
                        'signer_name' => $role->sort_order === 1 ? $unit->driver_name : null,
                    ]);
                }

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

        $signaturesByRole = $checklist->signatures->keyBy('signature_role_id');

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

        $signatures = $checklist->template->signatureRoles->map(function ($role) use ($signaturesByRole) {
            $signature = $signaturesByRole->get($role->id);

            return [
                'signature_role_id' => $role->id,
                'label' => $role->label,
                'signer_name' => $signature?->signer_name,
                'signature_url' => $signature?->signatureUrl(),
                'signed_at' => $signature?->signed_at
                    ?->timezone(config('app.timezone'))
                    ->format('d/m/Y H:i'),
            ];
        })->values();

        return Inertia::render('checklists/edit', [
            'checklist' => [
                'id' => $checklist->id,
                'status' => $checklist->status,
                'sealed_at' => optional($checklist->sealed_at)?->toIso8601String(),
                'is_sealed' => $checklist->isSealed(),
                'plate_number' => $checklist->plate_number,
                'driver_name' => $checklist->driver_name,
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
        $firstAlreadyApproved = $checklist->first_result === 'approved';
        $secondAlreadyApproved = $checklist->second_result === 'approved';

        try {
            $this->assertApprovalPayload($checklist, $data, $firstAlreadyApproved, $secondAlreadyApproved);

            DB::transaction(function () use ($checklist, $data, $shouldSeal, $firstAlreadyApproved, $secondAlreadyApproved): void {
                $incomingFirstResult = $data['first_result'] ?? null;
                $incomingSecondResult = $data['second_result'] ?? null;

                // La 1ra queda bloqueada al aprobarse; la 2da solo tras revisión del coordinador.
                $firstResult = $firstAlreadyApproved
                    ? $checklist->first_result
                    : $incomingFirstResult;
                $secondAllowed = $checklist->canStartSecondInspection()
                    || ($firstResult === 'approved' && $checklist->isReviewedByCoordinator());
                $secondResult = ! $secondAllowed
                    ? null
                    : ($secondAlreadyApproved
                        ? $checklist->second_result
                        : $incomingSecondResult);

                if (($incomingSecondResult ?? null) && ! $secondAllowed) {
                    throw new \RuntimeException(
                        'La 2da inspección solo se habilita cuando el coordinador responde el consolidado (estado Revisado).'
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
                    'first_inspected_on' => $firstAlreadyApproved
                        ? $checklist->first_inspected_on
                        : ($data['first_inspected_on'] ?? null),
                    'first_inspected_time' => $firstAlreadyApproved
                        ? $checklist->first_inspected_time
                        : ($data['first_inspected_time'] ?? null),
                    'second_inspected_on' => $firstResult !== 'approved'
                        ? null
                        : ($secondAlreadyApproved
                            ? $checklist->second_inspected_on
                            : ($data['second_inspected_on'] ?? null)),
                    'second_inspected_time' => $firstResult !== 'approved'
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
                    $payload = [
                        'observations' => $answer['observations'] ?? null,
                    ];

                    if (! $firstAlreadyApproved && array_key_exists('first_value', $answer)) {
                        $payload['first_value'] = $answer['first_value'] ?? null;
                    }

                    if (
                        $secondAllowed
                        && ! $secondAlreadyApproved
                        && array_key_exists('second_value', $answer)
                    ) {
                        $payload['second_value'] = $answer['second_value'] ?? null;
                    }

                    UnitChecklistAnswer::query()
                        ->where('unit_checklist_id', $checklist->id)
                        ->where('checklist_item_id', $answer['checklist_item_id'])
                        ->update($payload);
                }

                foreach ($data['signatures'] ?? [] as $signatureData) {
                    $signature = UnitChecklistSignature::query()
                        ->where('unit_checklist_id', $checklist->id)
                        ->where('signature_role_id', $signatureData['signature_role_id'])
                        ->first();

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

    public function storePhoto(Request $request, UnitChecklist $checklist): RedirectResponse
    {
        $checklist->loadMissing(['period', 'unit']);
        $this->ensureCanAccessChecklist($checklist);

        if ($checklist->period?->status !== 'active') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se pueden subir fotos en un periodo inactivo.',
            ]);
        }

        if ($checklist->isSealed()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esta inspección está sellada. No se pueden agregar fotos.',
            ]);
        }

        $validated = $request->validate([
            'inspection_pass' => ['required', Rule::in(['first', 'second'])],
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
            'captured_at' => ['nullable', 'date'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
        ], [
            'photo.required' => 'Debes tomar o seleccionar una foto.',
            'photo.image' => 'El archivo debe ser una imagen.',
            'photo.max' => 'La foto no puede superar los 10 MB.',
            'inspection_pass.required' => 'Indica si es 1ra o 2da inspección.',
        ]);

        $file = $request->file('photo');
        $pass = $validated['inspection_pass'];

        if ($pass === 'second' && ! $checklist->canStartSecondInspection()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La 2da inspección (y sus fotos) se habilitan cuando el consolidado está Revisado por el coordinador.',
            ]);
        }

        $directory = "checklists/{$checklist->id}/{$pass}";
        $path = $file->store($directory, 'public');

        UnitChecklistPhoto::query()->create([
            'unit_checklist_id' => $checklist->id,
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

        return back()->with('toast', [
            'type' => 'success',
            'message' => $pass === 'first'
                ? 'Foto de la 1ra inspección subida.'
                : 'Foto de la 2da inspección subida.',
        ]);
    }

    public function destroyPhoto(UnitChecklist $checklist, UnitChecklistPhoto $photo): RedirectResponse
    {
        if ($photo->unit_checklist_id !== $checklist->id) {
            abort(404);
        }

        $checklist->loadMissing(['period', 'unit']);
        $this->ensureCanAccessChecklist($checklist);

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

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Foto eliminada correctamente.',
        ]);
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
        ]);

        $signaturesByRole = $checklist->signatures->keyBy('signature_role_id');

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

        $signatures = $checklist->template->signatureRoles
            ->sortBy('sort_order')
            ->values()
            ->map(function ($role) use ($signaturesByRole, $toDataUri) {
                $signature = $signaturesByRole->get($role->id);
                $image = null;

                if ($signature?->signature_path) {
                    $candidate = Storage::disk('public')->path($signature->signature_path);
                    $image = $toDataUri($candidate);
                }

                return [
                    'label' => $role->label,
                    'signer_name' => $signature?->signer_name,
                    'image_src' => $image,
                    'signed_at' => $signature?->signed_at
                        ?->timezone(config('app.timezone'))
                        ->format('d/m/Y H:i'),
                ];
            });

        $photos = $checklist->photos->map(function (UnitChecklistPhoto $photo) use ($toDataUri) {
            $absolute = Storage::disk($photo->disk)->path($photo->path);

            return (object) [
                'inspection_pass' => $photo->inspection_pass,
                'captured_at' => $photo->captured_at,
                'latitude' => $photo->latitude,
                'longitude' => $photo->longitude,
                'image_src' => $toDataUri($absolute),
            ];
        });

        $paretoChart = ParetoPieChart::build($scored, $catalog > 0 ? $catalog : 100);

        $coordinatorSignatureSrc = $checklist->coordinator_signature_path
            ? $toDataUri(Storage::disk('public')->path($checklist->coordinator_signature_path))
            : null;

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
            if (($firstAlreadyApproved ? $checklist->first_result : $incomingFirst) !== 'approved') {
                throw new \RuntimeException('Debes aprobar la 1ra inspección antes de la 2da.');
            }

            if (! $checklist->isReviewedByCoordinator()) {
                throw new \RuntimeException(
                    'Debes esperar la respuesta del coordinador (estado Revisado) antes de la 2da inspección.'
                );
            }

            $this->assertPassAnswersReady($checklist, $answers, 'second');
        }
    }

    public function sendToCoordinator(Request $request, UnitChecklist $checklist): RedirectResponse
    {
        $checklist->loadMissing(['period', 'unit']);
        $this->ensureCanAccessChecklist($checklist);

        if ($checklist->period?->status !== 'active') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede enviar un checklist de un periodo inactivo.',
            ]);
        }

        if (! $checklist->canSendToCoordinator()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $checklist->first_result === null
                    ? 'Primero debes aprobar o desaprobar la 1ra inspección.'
                    : ($checklist->isReviewedByCoordinator()
                        ? 'Este consolidado ya fue revisado por el coordinador.'
                        : 'No se puede enviar este consolidado al coordinador.'),
            ]);
        }

        if (! $checklist->unit?->coordinator_id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La unidad no tiene coordinador asignado.',
            ]);
        }

        $checklist->update([
            'coordinator_status' => UnitChecklist::COORDINATOR_OBSERVED,
            'sent_to_coordinator_at' => now(),
        ]);

        app(PushNotificationService::class)
            ->notifyCoordinatorsConsolidationObserved($checklist->fresh(['unit']), Auth::user());

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Consolidado enviado al coordinador. Estado: Observado.',
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

        foreach ($expectedIds as $itemId) {
            $answer = $byItem->get($itemId);
            $item = $items->get($itemId);
            $label = $item?->item_number
                ? "{$item->item_number}. {$item->label}"
                : "Ítem #{$itemId}";

            $value = $answer[$valueKey] ?? null;

            if ($value === null || $value === '') {
                throw new \RuntimeException(
                    "Para aprobar la {$passLabel} inspección debes marcar SÍ/NO en todos los ítems. Falta: {$label}."
                );
            }

            if ($value !== 'yes') {
                throw new \RuntimeException(
                    "Para aprobar la {$passLabel} inspección todos los ítems deben estar en SÍ. Revisa: {$label}."
                );
            }

            $checkType = $item?->resolvedCheckType() ?? ParetoCheckTypes::OBSERVATION;
            $observation = trim((string) ($answer['observations'] ?? ''));

            if ($checkType === ParetoCheckTypes::EXPIRY && $observation === '') {
                throw new \RuntimeException(
                    "El ítem «{$label}» requiere vencimiento / observación antes de aprobar."
                );
            }
        }
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
