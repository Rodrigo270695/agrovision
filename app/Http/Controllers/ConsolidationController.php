<?php

namespace App\Http\Controllers;

use App\Models\UnitChecklist;
use App\Services\PushNotificationService;
use App\Support\IndexedRedirect;
use App\Support\PermissionCatalog;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ConsolidationController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['observed', 'reviewed', 'all'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        PermissionCatalog::syncToDatabase();

        $search = trim((string) ($validated['search'] ?? ''));
        $status = $validated['status'] ?? 'observed';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = UnitChecklist::query()
            ->with([
                'template:id,type,code,name',
                'period:id,name,date,status',
                'unit:id,correlative,plate_number,period_id,coordinator_id,driver_name',
            ])
            ->whereNotNull('coordinator_status')
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        }

        if ($status !== 'all') {
            $query->where('coordinator_status', $status);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('plate_number', 'ilike', "%{$search}%")
                    ->orWhere('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('provider', 'ilike', "%{$search}%");
            });
        }

        $query->orderByRaw("case when coordinator_status = 'observed' then 0 else 1 end")
            ->orderByDesc('sent_to_coordinator_at')
            ->orderByDesc('id');

        $items = $query->paginate($perPage)->withQueryString();

        $scope = UnitChecklist::query()
            ->whereNotNull('coordinator_status')
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $scope->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        }

        return Inertia::render('consolidations/index', [
            'items' => $items,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $scope)->count(),
                'observed' => (clone $scope)->where('coordinator_status', UnitChecklist::COORDINATOR_OBSERVED)->count(),
                'reviewed' => (clone $scope)->where('coordinator_status', UnitChecklist::COORDINATOR_REVIEWED)->count(),
            ],
        ]);
    }

    public function show(UnitChecklist $checklist): Response|RedirectResponse
    {
        $checklist->load([
            'period:id,name,date,status',
            'template:id,type,code,name',
            'unit:id,correlative,plate_number,period_id,coordinator_id,driver_name,provider',
        ]);

        $this->ensureCanAccess($checklist);

        if (! $checklist->coordinator_status) {
            return redirect()
                ->route('consolidations.index')
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Este informe aún no fue enviado a coordinador.',
                ]);
        }

        return Inertia::render('consolidations/show', [
            'checklist' => [
                'id' => $checklist->id,
                'plate_number' => $checklist->plate_number,
                'driver_name' => $checklist->driver_name,
                'provider' => $checklist->provider,
                'first_result' => $checklist->first_result,
                'second_result' => $checklist->second_result,
                'coordinator_status' => $checklist->coordinator_status,
                'sent_to_coordinator_at' => optional($checklist->sent_to_coordinator_at)?->toIso8601String(),
                'coordinator_action_plan' => $checklist->coordinator_action_plan,
                'coordinator_signer_name' => $checklist->coordinator_signer_name,
                'coordinator_signature_url' => $checklist->coordinatorSignatureUrl(),
                'coordinator_signed_at' => optional($checklist->coordinator_signed_at)
                    ?->timezone(config('app.timezone'))
                    ->format('d/m/Y H:i'),
                'coordinator_responded_at' => optional($checklist->coordinator_responded_at)?->toIso8601String(),
                'period' => $checklist->period,
                'template' => $checklist->template,
                'unit' => $checklist->unit,
                'can_respond' => $checklist->isObserved() && Auth::user()?->can('consolidations.respond'),
            ],
        ]);
    }

    public function respond(Request $request, UnitChecklist $checklist): RedirectResponse
    {
        $checklist->loadMissing('unit');
        $this->ensureCanAccess($checklist);

        if (! $checklist->isObserved()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Solo se puede responder consolidados en estado Observado.',
            ]);
        }

        $data = $request->validate([
            'coordinator_signer_name' => ['required', 'string', 'max:255'],
            'coordinator_action_plan' => ['required', 'string', 'max:5000'],
            'signature_data_url' => ['required', 'string'],
        ], [
            'coordinator_signer_name.required' => 'Indica el nombre de quien recibe.',
            'coordinator_action_plan.required' => 'El plan de acción / descargo es obligatorio.',
            'signature_data_url.required' => 'Debes firmar el recibido.',
        ]);

        DB::transaction(function () use ($checklist, $data) {
            $checklist->deleteCoordinatorSignatureFile();

            $path = SignatureImage::storeFromDataUrl(
                $data['signature_data_url'],
                "checklists/{$checklist->id}/coordinator",
            );

            $checklist->update([
                'coordinator_status' => UnitChecklist::COORDINATOR_REVIEWED,
                'coordinator_action_plan' => trim($data['coordinator_action_plan']),
                'coordinator_signer_name' => trim($data['coordinator_signer_name']),
                'coordinator_signature_path' => $path,
                'coordinator_signed_at' => now(),
                'coordinator_responded_at' => now(),
            ]);
        });

        app(PushNotificationService::class)
            ->notifyInspectorsConsolidationReviewed($checklist->fresh(), Auth::user());

        return IndexedRedirect::toIndex($request, 'consolidations.index', [
            'type' => 'success',
            'message' => 'Respuesta enviada. El consolidado quedó en estado Revisado y ya se puede continuar con la 2da inspección.',
        ]);
    }

    private function ensureCanAccess(UnitChecklist $checklist): void
    {
        if (! SystemRoles::currentIsScopedCoordinator()) {
            return;
        }

        if ((int) $checklist->unit?->coordinator_id !== (int) Auth::id()) {
            abort(403, 'Solo puedes ver consolidados de tus unidades.');
        }
    }
}
