<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUnitChecklistRequest;
use App\Http\Requests\UpdateUnitChecklistRequest;
use App\Models\ChecklistTemplate;
use App\Models\Period;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use App\Models\UnitChecklistPhoto;
use App\Models\UnitChecklistSignature;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
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
                'unit:id,correlative,plate_number,period_id',
            ])
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

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
            'activeUnits' => Unit::query()
                ->whereIn('period_id', $activePeriodIds)
                ->with('period:id,name,status,date')
                ->orderBy('plate_number')
                ->get([
                    'id',
                    'period_id',
                    'correlative',
                    'plate_number',
                    'driver_name',
                    'provider',
                    'category',
                ]),
            'stats' => [
                'total' => UnitChecklist::query()
                    ->whereHas('period', fn ($q) => $q->where('status', 'active'))
                    ->count(),
                'draft' => UnitChecklist::query()
                    ->where('status', 'draft')
                    ->whereHas('period', fn ($q) => $q->where('status', 'active'))
                    ->count(),
                'completed' => UnitChecklist::query()
                    ->where('status', 'completed')
                    ->whereHas('period', fn ($q) => $q->where('status', 'active'))
                    ->count(),
                'page' => $checklists->currentPage().'/'.max($checklists->lastPage(), 1),
                'on_screen' => $checklists->count(),
            ],
        ]);
    }

    public function store(StoreUnitChecklistRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $unit = Unit::query()->with('period')->findOrFail($data['unit_id']);

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

        $checklist = DB::transaction(function () use ($unit, $data) {
            $template = ChecklistTemplate::query()
                ->with(['items', 'signatureRoles'])
                ->findOrFail($data['template_id']);

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

            foreach ($template->items as $item) {
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
            'unit:id,correlative,plate_number,driver_name,provider,category,period_id',
            'template.items',
            'template.signatureRoles',
            'answers',
            'signatures',
            'photos',
        ]);

        if ($checklist->period?->status !== 'active') {
            return redirect()
                ->route('checklists.index')
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Este checklist pertenece a un periodo inactivo y no se puede editar.',
                ]);
        }

        $answersByItem = $checklist->answers->keyBy('checklist_item_id');
        $signaturesByRole = $checklist->signatures->keyBy('signature_role_id');

        $items = $checklist->template->items->map(function ($item) use ($answersByItem) {
            $answer = $answersByItem->get($item->id);

            return [
                'id' => $item->id,
                'parent_id' => $item->parent_id,
                'item_number' => $item->item_number,
                'label' => $item->label,
                'sort_order' => $item->sort_order,
                'has_expiry' => $item->has_expiry,
                'first_value' => $answer?->first_value,
                'second_value' => $answer?->second_value,
                'observations' => $answer?->observations,
            ];
        })->values();

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
        $checklist->loadMissing(['period', 'signatures', 'template.signatureRoles']);

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
            DB::transaction(function () use ($checklist, $data, $shouldSeal, $firstAlreadyApproved, $secondAlreadyApproved): void {
                $incomingFirstResult = $data['first_result'] ?? null;
                $incomingSecondResult = $data['second_result'] ?? null;

                // La 1ra queda bloqueada al aprobarse; la 2da solo existe tras aprobar la 1ra.
                $firstResult = $firstAlreadyApproved
                    ? $checklist->first_result
                    : $incomingFirstResult;
                $secondResult = ! $firstAlreadyApproved && $firstResult !== 'approved'
                    ? null
                    : ($secondAlreadyApproved
                        ? $checklist->second_result
                        : ($firstResult === 'approved' ? $incomingSecondResult : null));

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
                        $firstResult === 'approved'
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
        $checklist->loadMissing('period');

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

        if ($pass === 'second' && $checklist->first_result !== 'approved') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Primero debes aprobar la 1ra inspección para subir fotos de la 2da.',
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

        $checklist->loadMissing('period');

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

    public function pdf(UnitChecklist $checklist): Response|RedirectResponse
    {
        if (! $checklist->isSealed()) {
            return redirect()
                ->route('checklists.index')
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Solo se puede descargar el PDF de inspecciones selladas.',
                ]);
        }

        $checklist->load([
            'period:id,name,date,status',
            'template.items',
            'template.signatureRoles',
            'answers',
            'signatures',
            'photos',
        ]);

        $answersByItem = $checklist->answers->keyBy('checklist_item_id');
        $signaturesByRole = $checklist->signatures->keyBy('signature_role_id');

        $rows = $checklist->template->items
            ->sortBy('sort_order')
            ->values()
            ->map(function ($item) use ($answersByItem) {
                $answer = $answersByItem->get($item->id);

                return [
                    'item_number' => $item->item_number,
                    'label' => $item->label,
                    'is_child' => $item->parent_id !== null,
                    'first_value' => $answer?->first_value,
                    'second_value' => $answer?->second_value,
                    'observations' => $answer?->observations,
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

        $logoCandidates = [
            public_path('logo.png'),
            public_path('agro.png'),
            public_path('icon.png'),
        ];
        $logoPath = collect($logoCandidates)->first(fn (string $path) => is_file($path));
        $logoSrc = $toDataUri($logoPath);

        $type = strtoupper((string) ($checklist->template->type ?? 'INS'));
        $plate = preg_replace('/[^A-Za-z0-9\-_]/', '', (string) $checklist->plate_number) ?: 'placa';
        $filename = "inspeccion-{$type}-{$plate}-{$checklist->id}.pdf";

        $pdf = Pdf::loadView('pdfs.checklist-report', [
            'checklist' => $checklist,
            'rows' => $rows,
            'signatures' => $signatures,
            'photos' => $photos,
            'logoSrc' => $logoSrc,
        ])->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }

    public function destroy(Request $request, UnitChecklist $checklist): RedirectResponse
    {
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
}
