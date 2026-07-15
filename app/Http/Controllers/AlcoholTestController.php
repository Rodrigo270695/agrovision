<?php

namespace App\Http\Controllers;

use App\Models\AlcoholTest;
use App\Models\Period;
use App\Models\Unit;
use App\Services\PushNotificationService;
use App\Support\PermissionCatalog;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AlcoholTestController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['all', 'positive', 'negative', 'pending', 'acknowledged'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        PermissionCatalog::syncToDatabase();

        $search = trim((string) ($validated['search'] ?? ''));
        $status = $validated['status'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $query = $this->scopedQuery()
            ->with([
                'unit:id,correlative,plate_number,driver_name,coordinator_id',
                'period:id,name',
                'coordinator:id,name',
                'creator:id,name',
            ]);

        if ($status === 'positive') {
            $query->where('is_positive', true);
        } elseif ($status === 'negative') {
            $query->where('is_positive', false);
        } elseif ($status === 'pending') {
            $query->where('is_positive', true)
                ->where('coordinator_status', AlcoholTest::STATUS_PENDING);
        } elseif ($status === 'acknowledged') {
            $query->where('coordinator_status', AlcoholTest::STATUS_ACKNOWLEDGED);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('driver_dni', 'ilike', "%{$search}%")
                    ->orWhere('plate_number', 'ilike', "%{$search}%");
            });
        }

        $query->orderByRaw("case when coordinator_status = 'pending' then 0 else 1 end")
            ->orderByDesc('tested_at')
            ->orderByDesc('id');

        $items = $query->paginate($perPage)->withQueryString();

        $scope = $this->scopedQuery();

        return Inertia::render('alcohol-tests/index', [
            'items' => $items->through(fn (AlcoholTest $test) => $this->toListItem($test)),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $scope)->count(),
                'positive' => (clone $scope)->where('is_positive', true)->count(),
                'pending' => (clone $scope)->where('is_positive', true)
                    ->where('coordinator_status', AlcoholTest::STATUS_PENDING)
                    ->count(),
                'acknowledged' => (clone $scope)
                    ->where('coordinator_status', AlcoholTest::STATUS_ACKNOWLEDGED)
                    ->count(),
            ],
            'unitOptions' => $this->unitOptions(),
        ]);
    }

    public function store(Request $request, PushNotificationService $push): RedirectResponse
    {
        $validated = $request->validate([
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'tested_at' => ['required', 'date'],
            'driver_name' => ['required', 'string', 'max:255'],
            'driver_dni' => ['nullable', 'string', 'max:20'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'alcohol_level' => ['required', 'numeric', 'min:0', 'max:10'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'driver_name.required' => 'Indica el nombre del conductor.',
            'alcohol_level.required' => 'Indica el porcentaje de alcohol.',
            'tested_at.required' => 'Indica la fecha y hora del test.',
        ]);

        $unit = null;
        if (! empty($validated['unit_id'])) {
            $unit = Unit::query()->findOrFail((int) $validated['unit_id']);
            $this->ensureCanAccessUnit($unit);
        }

        $level = round((float) $validated['alcohol_level'], 3);
        $positive = AlcoholTest::isPositiveLevel($level);

        $test = AlcoholTest::query()->create([
            'unit_id' => $unit?->id,
            'period_id' => $unit?->period_id ?? Period::query()
                ->where('status', 'active')
                ->orderByDesc('date')
                ->value('id'),
            'created_by' => Auth::id(),
            'coordinator_id' => $unit?->coordinator_id,
            'tested_at' => $validated['tested_at'],
            'driver_name' => mb_strtoupper(trim($validated['driver_name'])),
            'driver_dni' => $validated['driver_dni'] ?? $unit?->driver_dni,
            'plate_number' => $validated['plate_number']
                ?? $unit?->plate_number,
            'alcohol_level' => $level,
            'is_positive' => $positive,
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'coordinator_status' => $positive
                ? AlcoholTest::STATUS_PENDING
                : null,
        ]);

        if ($positive) {
            $push->notifyCoordinatorAlcoholPositive($test);
            $test->update(['coordinator_notified_at' => now()]);
        }

        return redirect()
            ->route('alcohol-tests.index')
            ->with('toast', [
                'type' => $positive ? 'warning' : 'success',
                'message' => $positive
                    ? 'Test positivo (tolerancia 0). Se alertó al coordinador. No permitir ingreso.'
                    : 'Test registrado: resultado negativo.',
            ]);
    }

    public function show(AlcoholTest $alcoholTest): Response
    {
        $this->ensureCanAccess($alcoholTest);

        $alcoholTest->load([
            'unit:id,correlative,plate_number,driver_name,coordinator_id,provider',
            'period:id,name',
            'coordinator:id,name',
            'creator:id,name',
        ]);

        $canRespond = $alcoholTest->canCoordinatorRespond()
            && Auth::user()?->can('alcoholtests.respond')
            && (
                ! SystemRoles::currentIsScopedCoordinator()
                || (int) $alcoholTest->coordinator_id === (int) Auth::id()
            );

        return Inertia::render('alcohol-tests/show', [
            'test' => [
                ...$this->toListItem($alcoholTest),
                'location' => $alcoholTest->location,
                'notes' => $alcoholTest->notes,
                'coordinator_action_plan' => $alcoholTest->coordinator_action_plan,
                'coordinator_signer_name' => $alcoholTest->coordinator_signer_name,
                'coordinator_signature_url' => $alcoholTest->coordinatorSignatureUrl(),
                'coordinator_signed_at' => optional($alcoholTest->coordinator_signed_at)?->toIso8601String(),
                'coordinator_notified_at' => optional($alcoholTest->coordinator_notified_at)?->toIso8601String(),
                'can_respond' => $canRespond,
                'creator' => $alcoholTest->creator
                    ? ['id' => $alcoholTest->creator->id, 'name' => $alcoholTest->creator->name]
                    : null,
                'coordinator' => $alcoholTest->coordinator
                    ? ['id' => $alcoholTest->coordinator->id, 'name' => $alcoholTest->coordinator->name]
                    : null,
            ],
        ]);
    }

    public function respond(
        Request $request,
        AlcoholTest $alcoholTest,
    ): RedirectResponse {
        $this->ensureCanAccess($alcoholTest);

        if (! $alcoholTest->canCoordinatorRespond()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Este test ya no admite respuesta del coordinador.',
            ]);
        }

        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $alcoholTest->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'Solo el coordinador de la unidad puede firmar esta acta.');
        }

        $validated = $request->validate([
            'coordinator_signer_name' => ['required', 'string', 'max:255'],
            'coordinator_action_plan' => ['required', 'string', 'max:5000'],
            'signature_data_url' => ['required', 'string'],
        ], [
            'coordinator_action_plan.required' => 'Describe las medidas tomadas (no permitir ingreso, etc.).',
            'signature_data_url.required' => 'Debes firmar el acta.',
        ]);

        $path = SignatureImage::storeFromDataUrl(
            $validated['signature_data_url'],
            "alcohol-tests/{$alcoholTest->id}/signatures",
        );

        $alcoholTest->update([
            'coordinator_status' => AlcoholTest::STATUS_ACKNOWLEDGED,
            'coordinator_action_plan' => $validated['coordinator_action_plan'],
            'coordinator_signer_name' => $validated['coordinator_signer_name'],
            'coordinator_signature_path' => $path,
            'coordinator_signed_at' => now(),
        ]);

        return redirect()
            ->route('alcohol-tests.show', $alcoholTest)
            ->with('toast', [
                'type' => 'success',
                'message' => 'Acta firmada. Ya puedes descargar el PDF para gerencia.',
            ]);
    }

    public function pdf(AlcoholTest $alcoholTest): HttpResponse|RedirectResponse
    {
        $this->ensureCanAccess($alcoholTest);

        $alcoholTest->load(['unit', 'period', 'coordinator', 'creator']);

        $signatureSrc = null;
        if ($alcoholTest->coordinator_signature_path) {
            $absolute = \Illuminate\Support\Facades\Storage::disk('public')
                ->path($alcoholTest->coordinator_signature_path);
            if (is_file($absolute)) {
                $mime = mime_content_type($absolute) ?: 'image/png';
                $binary = file_get_contents($absolute);
                if ($binary !== false) {
                    $signatureSrc = 'data:'.$mime.';base64,'.base64_encode($binary);
                }
            }
        }

        $pdf = Pdf::loadView('pdfs.alcohol-test-acta', [
            'test' => $alcoholTest,
            'logoSrc' => \App\Support\PdfLogo::dataUri(),
            'signatureSrc' => $signatureSrc,
        ])->setPaper('a4', 'portrait');

        $safeName = preg_replace('/\W+/', '_', $alcoholTest->driver_name ?: 'conductor');

        return $pdf->download(
            'acta_alcoholimetro_'.$alcoholTest->id.'_'.$safeName.'.pdf'
        );
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<AlcoholTest>
     */
    private function scopedQuery()
    {
        $query = AlcoholTest::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        return $query;
    }

    /**
     * @return list<array{id: int, label: string, driver_name: string|null, driver_dni: string|null, plate_number: string|null, coordinator_id: int|null}>
     */
    private function unitOptions(): array
    {
        $query = Unit::query()
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '')
            ->orderByDesc('id')
            ->limit(200);

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        return $query
            ->get(['id', 'correlative', 'plate_number', 'driver_name', 'driver_dni', 'coordinator_id'])
            ->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'label' => trim(
                    ($unit->plate_number ?: 'S/P').' · '.($unit->driver_name ?: 'Sin conductor')
                    .($unit->correlative ? ' · '.$unit->correlative : '')
                ),
                'driver_name' => $unit->driver_name,
                'driver_dni' => $unit->driver_dni,
                'plate_number' => $unit->plate_number,
                'coordinator_id' => $unit->coordinator_id,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function toListItem(AlcoholTest $test): array
    {
        return [
            'id' => $test->id,
            'tested_at' => optional($test->tested_at)?->toIso8601String(),
            'driver_name' => $test->driver_name,
            'driver_dni' => $test->driver_dni,
            'plate_number' => $test->plate_number,
            'alcohol_level' => (float) $test->alcohol_level,
            'is_positive' => $test->is_positive,
            'coordinator_status' => $test->coordinator_status,
            'period' => $test->period
                ? ['id' => $test->period->id, 'name' => $test->period->name]
                : null,
            'unit' => $test->unit
                ? [
                    'id' => $test->unit->id,
                    'correlative' => $test->unit->correlative ?? null,
                ]
                : null,
        ];
    }

    private function ensureCanAccess(AlcoholTest $test): void
    {
        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $test->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a este test de alcohómetro.');
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
}
