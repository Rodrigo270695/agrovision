<?php

namespace App\Http\Controllers;

use App\Models\InspectionBatch;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Support\PdfLogo;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class InspectionBatchController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['sent', 'signed', 'all'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $status = $validated['status'] ?? 'sent';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = $this->scopedQuery()
            ->with('coordinator:id,name')
            ->withCount('checklists');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->whereHas('coordinator', fn ($q) => $q->where('name', 'ilike', "%{$search}%"))
                    ->orWhereHas('checklists', function ($q) use ($search) {
                        $q->where('plate_number', 'ilike', "%{$search}%")
                            ->orWhere('driver_name', 'ilike', "%{$search}%");
                    });
            });
        }

        $items = $query
            ->orderByRaw("case when status = 'sent' then 0 else 1 end")
            ->orderByDesc('inspected_on')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (InspectionBatch $batch) => [
                'id' => $batch->id,
                'inspected_on' => $batch->inspected_on->format('Y-m-d'),
                'status' => $batch->status,
                'checklists_count' => $batch->checklists_count,
                'coordinator_name' => $batch->coordinator?->name,
                'sent_at' => optional($batch->sent_at)?->toIso8601String(),
                'signed_at' => optional($batch->signed_at)?->toIso8601String(),
                'signer_name' => $batch->signer_name,
            ]);

        $scope = $this->scopedQuery();

        return Inertia::render('inspection-batches/index', [
            'items' => $items,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $scope)->count(),
                'sent' => (clone $scope)->where('status', InspectionBatch::STATUS_SENT)->count(),
                'signed' => (clone $scope)->where('status', InspectionBatch::STATUS_SIGNED)->count(),
            ],
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $date = Carbon::parse($validated['date'])->toDateString();
        $checklists = $this->checklistsForDate($date);

        $groups = [];
        $pending = 0;
        $withoutCoordinator = 0;
        $alreadySigned = 0;

        foreach ($checklists as $checklist) {
            $closed = in_array($checklist->first_result, ['approved', 'rejected'], true);
            $coordinatorId = $checklist->unit?->coordinator_id;

            if (! $closed) {
                $pending++;

                continue;
            }

            if ($checklist->inspectionBatch?->isSigned()) {
                $alreadySigned++;

                continue;
            }

            if (! $coordinatorId) {
                $withoutCoordinator++;

                continue;
            }

            if (! isset($groups[$coordinatorId])) {
                $groups[$coordinatorId] = [
                    'coordinator_id' => (int) $coordinatorId,
                    'coordinator_name' => (string) ($checklist->unit?->coordinatorUser?->name ?? 'Coordinador'),
                    'ready' => 0,
                ];
            }

            $groups[$coordinatorId]['ready']++;
        }

        return response()->json([
            'date' => $date,
            'groups' => array_values($groups),
            'pending' => $pending,
            'without_coordinator' => $withoutCoordinator,
            'already_signed' => $alreadySigned,
            'total' => $checklists->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $date = Carbon::parse($validated['date'])->toDateString();
        $checklists = $this->checklistsForDate($date);

        /** @var Collection<int, Collection<int, UnitChecklist>> $readyByCoordinator */
        $readyByCoordinator = $checklists
            ->filter(function (UnitChecklist $checklist) {
                return in_array($checklist->first_result, ['approved', 'rejected'], true)
                    && $checklist->unit?->coordinator_id
                    && ! $checklist->inspectionBatch?->isSigned();
            })
            ->groupBy(fn (UnitChecklist $checklist) => (int) $checklist->unit->coordinator_id);

        $pending = $checklists
            ->reject(fn (UnitChecklist $checklist) => in_array($checklist->first_result, ['approved', 'rejected'], true))
            ->count();

        if ($readyByCoordinator->isEmpty()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $pending > 0
                    ? 'Ese día aún no hay inspecciones con la 1ra cerrada para enviar.'
                    : 'No hay inspecciones de esa fecha para enviar.',
            ]);
        }

        $packages = 0;
        $attached = 0;
        $batches = [];

        DB::transaction(function () use ($readyByCoordinator, $date, &$packages, &$attached, &$batches): void {
            foreach ($readyByCoordinator as $coordinatorId => $rows) {
                $batch = InspectionBatch::query()
                    ->where('coordinator_id', $coordinatorId)
                    ->whereDate('inspected_on', $date)
                    ->lockForUpdate()
                    ->first();

                if ($batch?->isSigned()) {
                    continue;
                }

                if (! $batch) {
                    $batch = InspectionBatch::query()->create([
                        'coordinator_id' => $coordinatorId,
                        'inspected_on' => $date,
                        'status' => InspectionBatch::STATUS_SENT,
                        'sent_by' => Auth::id(),
                        'sent_at' => now(),
                    ]);
                } else {
                    $batch->update([
                        'status' => InspectionBatch::STATUS_SENT,
                        'sent_by' => Auth::id(),
                        'sent_at' => now(),
                    ]);
                }

                UnitChecklist::query()
                    ->whereIn('id', $rows->pluck('id'))
                    ->update(['inspection_batch_id' => $batch->id]);

                $packages++;
                $attached += $rows->count();
                $batches[] = $batch;
            }
        });

        $push = app(PushNotificationService::class);

        foreach ($batches as $batch) {
            $push->notifyInspectionBatch($batch->fresh());
        }

        $label = Carbon::parse($date)->format('d/m/Y');
        $message = "Paquete del {$label}: {$attached} inspecciones enviadas a {$packages} coordinador(es). Una firma cubre todo el paquete.";

        if ($pending > 0) {
            $message .= " Quedaron {$pending} sin la 1ra inspección cerrada.";
        }

        return redirect()
            ->route('inspection-batches.index')
            ->with('toast', [
                'type' => 'success',
                'message' => $message,
            ]);
    }

    public function show(InspectionBatch $batch): Response
    {
        $this->ensureCanAccess($batch);
        $batch->load('coordinator:id,name');

        $rows = $this->reportRows($batch);
        $conformes = $rows->where('conforme', true)->count();

        return Inertia::render('inspection-batches/show', [
            'batch' => [
                'id' => $batch->id,
                'inspected_on' => $batch->inspected_on->format('Y-m-d'),
                'status' => $batch->status,
                'coordinator_name' => $batch->coordinator?->name,
                'sent_at' => optional($batch->sent_at)?->toIso8601String(),
                'signed_at' => optional($batch->signed_at)?->toIso8601String(),
                'signer_name' => $batch->signer_name,
                'signature_url' => $batch->signatureUrl(),
                'can_sign' => $this->canSign($batch),
                'total' => $rows->count(),
                'conformes' => $conformes,
                'faltantes' => $rows->count() - $conformes,
            ],
            'checklists' => $rows->values(),
        ]);
    }

    public function sign(Request $request, InspectionBatch $batch): RedirectResponse
    {
        $this->ensureCanAccess($batch);

        if (! $this->canSign($batch)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $batch->isSigned()
                    ? 'Este paquete ya tiene la firma masiva del coordinador.'
                    : 'Solo el coordinador del paquete puede firmarlo.',
            ]);
        }

        $data = $request->validate([
            'signature_data_url' => ['required', 'string'],
        ], [
            'signature_data_url.required' => 'Debes firmar el paquete.',
        ]);

        $signerName = trim((string) (Auth::user()?->name ?? ''));

        if ($signerName === '') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se pudo identificar al coordinador en sesión.',
            ]);
        }

        try {
            $path = SignatureImage::storeFromDataUrl(
                $data['signature_data_url'],
                "inspection-batches/{$batch->id}",
            );
        } catch (\RuntimeException $exception) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $exception->getMessage(),
            ]);
        }

        $batch->update([
            'status' => InspectionBatch::STATUS_SIGNED,
            'signer_name' => $signerName,
            'signature_path' => $path,
            'signed_at' => now(),
        ]);

        $total = $batch->checklists()->count();

        return back()->with('toast', [
            'type' => 'success',
            'message' => "Firma masiva aplicada a las {$total} inspecciones del paquete.",
        ]);
    }

    public function pdf(InspectionBatch $batch): HttpResponse
    {
        $this->ensureCanAccess($batch);
        $batch->load('coordinator:id,name');

        $rows = $this->reportRows($batch);
        $signatureSrc = null;

        if ($batch->signature_path) {
            $absolute = Storage::disk('public')->path($batch->signature_path);

            if (is_file($absolute)) {
                $mime = mime_content_type($absolute) ?: 'image/png';
                $binary = file_get_contents($absolute);

                if ($binary !== false && $binary !== '') {
                    $signatureSrc = 'data:'.$mime.';base64,'.base64_encode($binary);
                }
            }
        }

        $filename = 'paquete-inspecciones-'.$batch->inspected_on->format('Y-m-d').'-'.$batch->id.'.pdf';

        return Pdf::loadView('pdfs.inspection-batch-report', [
            'batch' => $batch,
            'rows' => $rows,
            'conformes' => $rows->where('conforme', true)->count(),
            'faltantes' => $rows->where('conforme', false)->count(),
            'signatureSrc' => $signatureSrc,
            'logoSrc' => PdfLogo::dataUri(),
        ])->setPaper('a4', 'portrait')->stream($filename);
    }

    /**
     * @return Collection<int, UnitChecklist>
     */
    private function checklistsForDate(string $date): Collection
    {
        $query = UnitChecklist::query()
            ->with([
                'unit:id,coordinator_id',
                'unit.coordinatorUser:id,name',
                'inspectionBatch:id,status',
            ])
            ->whereDate('first_inspected_on', $date)
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', fn ($builder) => $builder->where('coordinator_id', Auth::id()));
        }

        return $query->orderBy('plate_number')->get();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function reportRows(InspectionBatch $batch): Collection
    {
        $batch->load([
            'checklists.answers.item',
        ]);

        return $batch->checklists
            ->sortBy(fn (UnitChecklist $checklist) => $checklist->plate_number)
            ->values()
            ->map(function (UnitChecklist $checklist) {
                $usesSecond = $checklist->second_result !== null;

                $items = $checklist->answers
                    ->filter(fn (UnitChecklistAnswer $answer) => $answer->item !== null)
                    ->sortBy(fn (UnitChecklistAnswer $answer) => [
                        $answer->item->sort_order,
                        $answer->item->id,
                    ])
                    ->values()
                    ->map(function (UnitChecklistAnswer $answer) use ($usesSecond) {
                        $value = $usesSecond
                            ? $answer->second_value
                            : $answer->first_value;

                        return [
                            'number' => $answer->item->item_number,
                            'label' => $answer->item->label,
                            'value' => $value,
                        ];
                    });

                $ok = $items->where('value', 'yes')->count();
                $fail = $items->where('value', 'no')->count();
                $decided = $usesSecond
                    ? $checklist->second_result !== null
                    : $checklist->first_result !== null;

                return [
                    'id' => $checklist->id,
                    'plate_number' => $checklist->plate_number,
                    'driver_name' => $checklist->driver_name,
                    'provider' => $checklist->provider,
                    'first_result' => $checklist->first_result,
                    'second_result' => $checklist->second_result,
                    'reviewed_pass' => $usesSecond ? '2da' : '1ra',
                    'ok' => $ok,
                    'fail' => $fail,
                    'conforme' => $fail === 0 && $decided && $ok > 0,
                    'items' => $items->values()->all(),
                ];
            });
    }

    private function scopedQuery()
    {
        $query = InspectionBatch::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        return $query;
    }

    private function ensureCanAccess(InspectionBatch $batch): void
    {
        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $batch->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a este paquete.');
        }
    }

    private function canSign(InspectionBatch $batch): bool
    {
        $user = Auth::user();

        if (! $user instanceof User || $batch->isSigned()) {
            return false;
        }

        if (! $user->can('consolidations.respond')) {
            return false;
        }

        if ($user->hasRole(SystemRoles::SUPERADMIN)) {
            return true;
        }

        return (int) $batch->coordinator_id === (int) $user->id;
    }
}
