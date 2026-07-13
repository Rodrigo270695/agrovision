<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInspectionRequest;
use App\Http\Requests\StoreSecondAttemptRequest;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Services\InspectionStoreService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InspectionController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'q' => trim((string) $request->string('q')),
            'type' => strtoupper((string) $request->string('type')),
            'estado' => (string) $request->string('estado'),
            'resultado' => (string) $request->string('resultado'),
        ];

        $templates = ChecklistTemplate::query()
            ->where('is_active', true)
            ->orderBy('short_code')
            ->get(['id', 'code', 'short_code', 'name', 'unit_type', 'description']);

        $inspections = Inspection::query()
            ->with([
                'templateVersion.template',
                'attempts' => fn ($q) => $q->orderBy('attempt_number'),
            ])
            ->when($filters['q'] !== '', function ($query) use ($filters) {
                $term = '%'.$filters['q'].'%';
                $plate = strtoupper(preg_replace('/\s+/', '', $filters['q']) ?? '');

                $query->where(function ($inner) use ($term, $plate) {
                    $inner->where('vehicle_plate_snapshot', 'ilike', $term)
                        ->orWhere('vehicle_plate_snapshot', 'ilike', '%'.$plate.'%')
                        ->orWhere('driver_name_snapshot', 'ilike', $term)
                        ->orWhere('company_name_snapshot', 'ilike', $term)
                        ->orWhere('driver_license_snapshot', 'ilike', $term)
                        ->orWhere('location', 'ilike', $term);
                });
            })
            ->when(in_array($filters['type'], ['TDP', 'TDC'], true), function ($query) use ($filters) {
                $query->whereHas('templateVersion.template', function ($template) use ($filters) {
                    $template->where('short_code', $filters['type']);
                });
            })
            ->when($filters['estado'] !== '', function ($query) use ($filters) {
                $query->where('status', $filters['estado']);
            })
            ->when($filters['resultado'] !== '', function ($query) use ($filters) {
                $query->whereHas('attempts', function ($attempt) use ($filters) {
                    $attempt->where('result', $filters['resultado']);
                });
            })
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Inspection $inspection) => $this->mapInspectionCard($inspection));

        $pendingReinspections = Inspection::query()
            ->with(['templateVersion.template', 'attempts'])
            ->where('status', 'pendiente_reinspeccion')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Inspection $inspection) => $this->mapInspectionCard($inspection));

        return Inertia::render('inspections/index', [
            'templates' => $templates,
            'inspections' => $inspections,
            'pendingReinspections' => $pendingReinspections,
            'filters' => $filters,
        ]);
    }

    public function create(string $type): Response
    {
        $type = strtoupper($type);
        abort_unless(in_array($type, ['TDP', 'TDC'], true), 404);

        return Inertia::render('inspections/form', [
            'mode' => 'first',
            'inspection' => null,
            ...$this->formPayload($type),
        ]);
    }

    public function reinspect(Inspection $inspection): Response
    {
        $inspection->load([
            'attempts.answers',
            'signatures',
            'templateVersion.template',
            'templateVersion.items',
            'templateVersion.signatureSlots',
        ]);

        $first = $inspection->attempts->firstWhere('attempt_number', 1);
        $hasSecond = $inspection->attempts->contains('attempt_number', 2);

        abort_if($first === null || $first->result !== 'desaprobado' || $hasSecond, 404);

        $template = $inspection->templateVersion->template;
        $version = $inspection->templateVersion;

        $firstAnswers = $first->answers->keyBy('checklist_item_id');

        return Inertia::render('inspections/form', [
            'mode' => 'second',
            'inspection' => [
                'id' => $inspection->id,
                'plate' => $inspection->vehicle_plate_snapshot,
                'company_name' => $inspection->company_name_snapshot,
                'driver_name' => $inspection->driver_name_snapshot,
                'license_number' => $inspection->driver_license_snapshot,
                'license_class' => $inspection->driver_license_class_snapshot,
                'license_revalidation_date' => optional($inspection->driver_license_revalidation_snapshot)?->format('Y-m-d'),
                'brand_model_year' => $inspection->vehicle_brand_model_year_snapshot,
                'location' => $inspection->location,
                'additional_observations' => $inspection->additional_observations,
                'first_attempt' => [
                    'inspected_at' => optional($first->inspected_at)?->toIso8601String(),
                    'result' => $first->result,
                ],
                'first_answers' => $version->items
                    ->where('is_group', false)
                    ->map(fn ($item) => [
                        'item_id' => $item->id,
                        'complies' => $firstAnswers->get($item->id)?->complies,
                        'observation' => $firstAnswers->get($item->id)?->observation,
                        'expiry_date' => optional($firstAnswers->get($item->id)?->expiry_date)?->format('Y-m-d'),
                    ])
                    ->values(),
                'signatures' => $inspection->signatures->map(fn ($signature) => [
                    'role' => $signature->role,
                    'signer_name' => $signature->signer_name,
                ])->values(),
            ],
            'template' => [
                'id' => $template->id,
                'code' => $template->code,
                'short_code' => $template->short_code,
                'name' => $template->name,
                'unit_type' => $template->unit_type,
                'description' => $template->description,
            ],
            'version' => [
                'id' => $version->id,
                'version_number' => $version->version_number,
                'document_title' => $version->document_title,
            ],
            'items' => $version->items->sortBy('sort_order')->values()->map(fn ($item) => [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'item_number' => $item->item_number,
                'label' => $item->label,
                'is_group' => $item->is_group,
                'requires_expiry' => $item->requires_expiry,
                'parent_item_id' => $item->parent_item_id,
                'sort_order' => $item->sort_order,
            ]),
            'signatureSlots' => $version->signatureSlots->sortBy('sort_order')->values()->map(fn ($slot) => [
                'role' => $slot->role,
                'label' => $slot->label,
                'sort_order' => $slot->sort_order,
            ]),
        ]);
    }

    public function store(StoreInspectionRequest $request, InspectionStoreService $service): RedirectResponse
    {
        $inspection = $service->storeFirst(
            $request->validated(),
            $request->user()->id,
        );

        $message = $inspection->status === 'pendiente_reinspeccion'
            ? "1ra inspección de {$inspection->vehicle_plate_snapshot} desaprobada. Quedó pendiente de 2da inspección."
            : "Inspección {$inspection->vehicle_plate_snapshot} aprobada y cerrada.";

        return redirect()
            ->route('inspections.index', ['q' => $inspection->vehicle_plate_snapshot])
            ->with('success', $message);
    }

    public function storeSecond(
        StoreSecondAttemptRequest $request,
        Inspection $inspection,
        InspectionStoreService $service,
    ): RedirectResponse {
        $inspection = $service->storeSecond(
            $inspection,
            $request->validated(),
            $request->user()->id,
        );

        return redirect()
            ->route('inspections.index', ['q' => $inspection->vehicle_plate_snapshot])
            ->with('success', "2da inspección de {$inspection->vehicle_plate_snapshot} guardada correctamente.");
    }

    /**
     * @return array<string, mixed>
     */
    private function formPayload(string $type): array
    {
        $template = ChecklistTemplate::query()
            ->where('short_code', $type)
            ->where('is_active', true)
            ->firstOrFail();

        $version = $template->publishedVersion();
        abort_if($version === null, 404);

        $version->load([
            'items' => fn ($q) => $q->orderBy('sort_order'),
            'signatureSlots' => fn ($q) => $q->orderBy('sort_order'),
        ]);

        return [
            'template' => [
                'id' => $template->id,
                'code' => $template->code,
                'short_code' => $template->short_code,
                'name' => $template->name,
                'unit_type' => $template->unit_type,
                'description' => $template->description,
            ],
            'version' => [
                'id' => $version->id,
                'version_number' => $version->version_number,
                'document_title' => $version->document_title,
            ],
            'items' => $version->items->map(fn ($item) => [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'item_number' => $item->item_number,
                'label' => $item->label,
                'is_group' => $item->is_group,
                'requires_expiry' => $item->requires_expiry,
                'parent_item_id' => $item->parent_item_id,
                'sort_order' => $item->sort_order,
            ]),
            'signatureSlots' => $version->signatureSlots->map(fn ($slot) => [
                'role' => $slot->role,
                'label' => $slot->label,
                'sort_order' => $slot->sort_order,
            ]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapInspectionCard(Inspection $inspection): array
    {
        $first = $inspection->attempts->firstWhere('attempt_number', 1);
        $second = $inspection->attempts->firstWhere('attempt_number', 2);
        $canReinspect = $inspection->status === 'pendiente_reinspeccion'
            && $first?->result === 'desaprobado'
            && $second === null;

        return [
            'id' => $inspection->id,
            'plate' => $inspection->vehicle_plate_snapshot,
            'driver' => $inspection->driver_name_snapshot,
            'company' => $inspection->company_name_snapshot,
            'location' => $inspection->location,
            'status' => $inspection->status,
            'type' => $inspection->templateVersion?->template?->short_code,
            'code' => $inspection->templateVersion?->template?->code,
            'first_result' => $first?->result,
            'second_result' => $second?->result,
            'first_at' => optional($first?->inspected_at)?->toIso8601String(),
            'second_at' => optional($second?->inspected_at)?->toIso8601String(),
            'created_at' => optional($inspection->created_at)?->toIso8601String(),
            'can_reinspect' => $canReinspect,
        ];
    }
}
