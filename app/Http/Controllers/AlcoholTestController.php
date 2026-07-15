<?php

namespace App\Http\Controllers;

use App\Models\AlcoholTest;
use App\Models\AlcoholTestPackage;
use App\Models\Period;
use App\Models\Unit;
use App\Services\PushNotificationService;
use App\Support\PermissionCatalog;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AlcoholTestController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        PermissionCatalog::syncToDatabase();

        $search = trim((string) ($validated['search'] ?? ''));
        $perPage = (int) ($validated['per_page'] ?? 10);

        $isCoordinator = SystemRoles::currentIsScopedCoordinator();
        $coordinatorId = $isCoordinator ? Auth::id() : null;

        $query = $this->scopedPackagesQuery()
            ->withCount($this->packageTestCounts($coordinatorId))
            ->with('creator:id,name');

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('title', 'ilike', "%{$search}%")
                    ->orWhere('notes', 'ilike', "%{$search}%");
            });
        }

        $packages = $query
            ->orderByDesc('session_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $scope = $this->scopedPackagesQuery();
        $testsScope = AlcoholTest::query()
            ->whereIn('package_id', (clone $scope)->select('id'));

        if ($coordinatorId !== null) {
            $testsScope->where('coordinator_id', $coordinatorId);
        }

        return Inertia::render('alcohol-tests/index', [
            'packages' => $packages->through(fn (AlcoholTestPackage $package) => [
                'id' => $package->id,
                'title' => $package->title,
                'session_date' => optional($package->session_date)?->toDateString(),
                'notes' => $package->notes,
                'tests_count' => (int) $package->tests_count,
                'positive_count' => (int) $package->positive_count,
                'pending_count' => (int) $package->pending_count,
                'creator' => $package->creator
                    ? ['id' => $package->creator->id, 'name' => $package->creator->name]
                    : null,
            ]),
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $scope)->count(),
                'tests' => (clone $testsScope)->count(),
                'positive' => (clone $testsScope)->where('is_positive', true)->count(),
                'pending' => (clone $testsScope)
                    ->where('is_positive', true)
                    ->where('coordinator_status', AlcoholTest::STATUS_PENDING)
                    ->count(),
            ],
            'isCoordinatorView' => $isCoordinator,
        ]);
    }

    public function storePackage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'session_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'title.required' => 'Indica un título para el paquete (ej. Test inopinada fiestas).',
            'session_date.required' => 'Indica la fecha del operativo.',
        ]);

        $package = AlcoholTestPackage::query()->create([
            'title' => trim($validated['title']),
            'session_date' => $validated['session_date'],
            'notes' => $validated['notes'] ?? null,
            'created_by' => Auth::id(),
            'period_id' => Period::query()
                ->where('status', 'active')
                ->orderByDesc('date')
                ->value('id'),
        ]);

        return redirect()
            ->route('alcohol-tests.show', $package)
            ->with('toast', [
                'type' => 'success',
                'message' => 'Paquete creado. Ya puedes registrar los tests.',
            ]);
    }

    public function show(Request $request, AlcoholTestPackage $alcoholimetro): Response
    {
        $this->ensureCanAccessPackage($alcoholimetro);

        $alcoholimetro->load('creator:id,name');
        $isCoordinator = SystemRoles::currentIsScopedCoordinator();

        $testsQuery = $alcoholimetro->tests()
            ->with([
                'unit:id,correlative,plate_number,driver_name,coordinator_id',
                'coordinator:id,name',
            ])
            ->orderByDesc('tested_at')
            ->orderByDesc('id');

        if ($isCoordinator) {
            $testsQuery->where('coordinator_id', Auth::id());
        }

        $tests = $testsQuery->get();
        $positive = $tests->where('is_positive', true)->count();
        $pending = $tests
            ->where('is_positive', true)
            ->where('coordinator_status', AlcoholTest::STATUS_PENDING)
            ->count();

        return Inertia::render('alcohol-tests/show', [
            'package' => [
                'id' => $alcoholimetro->id,
                'title' => $alcoholimetro->title,
                'session_date' => optional($alcoholimetro->session_date)?->toDateString(),
                'notes' => $alcoholimetro->notes,
                'creator' => $alcoholimetro->creator
                    ? ['id' => $alcoholimetro->creator->id, 'name' => $alcoholimetro->creator->name]
                    : null,
            ],
            'tests' => $tests->map(fn (AlcoholTest $test) => $this->toTestItem($test))->values(),
            'stats' => [
                'total' => $tests->count(),
                'positive' => $positive,
                'pending' => $pending,
                'acknowledged' => $tests
                    ->where('coordinator_status', AlcoholTest::STATUS_ACKNOWLEDGED)
                    ->count(),
            ],
            'unitOptions' => $isCoordinator ? [] : $this->unitOptions(),
            'focusTestId' => $request->integer('test') ?: null,
            'isCoordinatorView' => $isCoordinator,
        ]);
    }

    public function storeTest(
        Request $request,
        AlcoholTestPackage $alcoholimetro,
        PushNotificationService $push,
    ): RedirectResponse {
        $this->ensureCanAccessPackage($alcoholimetro);

        $validated = $request->validate([
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'tested_at' => ['nullable', 'date'],
            'driver_name' => ['required', 'string', 'max:255'],
            'driver_dni' => ['nullable', 'string', 'max:20'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'alcohol_level' => ['required', 'numeric', 'min:0', 'max:10'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'unit_id.required' => 'Selecciona la unidad (así se alerta a su coordinador si es positivo).',
            'driver_name.required' => 'Indica el nombre del conductor.',
            'alcohol_level.required' => 'Indica el porcentaje de alcohol.',
        ]);

        $unit = Unit::query()->findOrFail((int) $validated['unit_id']);
        $this->ensureCanAccessUnit($unit);

        $level = round((float) $validated['alcohol_level'], 3);
        $positive = AlcoholTest::isPositiveLevel($level);
        $testedAt = $validated['tested_at']
            ?? optional($alcoholimetro->session_date)?->setTimeFrom(now())
            ?? now();

        $test = AlcoholTest::query()->create([
            'package_id' => $alcoholimetro->id,
            'unit_id' => $unit->id,
            'period_id' => $alcoholimetro->period_id ?? $unit->period_id,
            'created_by' => Auth::id(),
            'coordinator_id' => $unit->coordinator_id,
            'tested_at' => $testedAt,
            'driver_name' => mb_strtoupper(trim($validated['driver_name'])),
            'driver_dni' => $validated['driver_dni'] ?? $unit->driver_dni,
            'plate_number' => $validated['plate_number'] ?? $unit->plate_number,
            'alcohol_level' => $level,
            'is_positive' => $positive,
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'coordinator_status' => $positive ? AlcoholTest::STATUS_PENDING : null,
        ]);

        $notified = false;

        if ($positive && $test->coordinator_id) {
            $push->notifyCoordinatorAlcoholPositive($test);
            $test->update(['coordinator_notified_at' => now()]);
            $notified = true;
        }

        return redirect()
            ->route('alcohol-tests.show', $alcoholimetro)
            ->with('toast', [
                'type' => $positive ? 'warning' : 'success',
                'message' => $positive
                    ? ($notified
                        ? 'Test positivo (tolerancia 0). Se alertó al coordinador de la unidad. No permitir ingreso.'
                        : 'Test positivo (tolerancia 0), pero la unidad no tiene coordinador asignado: no se envió alerta.')
                    : 'Test registrado en el paquete: negativo.',
            ]);
    }

    public function showTest(AlcoholTest $test): Response|RedirectResponse
    {
        $this->ensureCanAccessTest($test);
        $test->loadMissing('package');

        if ($test->package) {
            return redirect()->route('alcohol-tests.show', [
                'alcoholimetro' => $test->package_id,
                'test' => $test->id,
            ]);
        }

        abort(404);
    }

    public function respond(Request $request, AlcoholTest $test): RedirectResponse
    {
        $this->ensureCanAccessTest($test);

        if (! $test->canCoordinatorRespond()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Este test ya no admite respuesta del coordinador.',
            ]);
        }

        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $test->coordinator_id !== (int) Auth::id()
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
            "alcohol-tests/{$test->id}/signatures",
        );

        $test->update([
            'coordinator_status' => AlcoholTest::STATUS_ACKNOWLEDGED,
            'coordinator_action_plan' => $validated['coordinator_action_plan'],
            'coordinator_signer_name' => $validated['coordinator_signer_name'],
            'coordinator_signature_path' => $path,
            'coordinator_signed_at' => now(),
        ]);

        return redirect()
            ->route('alcohol-tests.show', [
                'alcoholimetro' => $test->package_id,
                'test' => $test->id,
            ])
            ->with('toast', [
                'type' => 'success',
                'message' => 'Acta firmada. Puedes descargar el PDF del paquete o del caso.',
            ]);
    }

    public function packagePdf(AlcoholTestPackage $alcoholimetro): HttpResponse
    {
        $this->ensureCanAccessPackage($alcoholimetro);

        $testsQuery = $alcoholimetro->tests()
            ->with(['coordinator', 'creator', 'unit'])
            ->orderBy('driver_name');

        if (SystemRoles::currentIsScopedCoordinator()) {
            $testsQuery->where('coordinator_id', Auth::id());
        }

        $tests = $testsQuery->get();

        $pdf = Pdf::loadView('pdfs.alcohol-test-package-report', [
            'package' => $alcoholimetro,
            'tests' => $tests,
            'logoSrc' => \App\Support\PdfLogo::dataUri(),
        ])->setPaper('a4', 'portrait');

        $safe = preg_replace('/\W+/', '_', $alcoholimetro->title) ?: 'paquete';

        return $pdf->download('alcoholimetro_'.$alcoholimetro->id.'_'.$safe.'.pdf');
    }

    public function testPdf(AlcoholTest $test): HttpResponse
    {
        $this->ensureCanAccessTest($test);

        $test->load(['unit', 'period', 'coordinator', 'creator', 'package']);

        $signatureSrc = null;
        if ($test->coordinator_signature_path) {
            $absolute = Storage::disk('public')->path($test->coordinator_signature_path);
            if (is_file($absolute)) {
                $mime = mime_content_type($absolute) ?: 'image/png';
                $binary = file_get_contents($absolute);
                if ($binary !== false) {
                    $signatureSrc = 'data:'.$mime.';base64,'.base64_encode($binary);
                }
            }
        }

        $pdf = Pdf::loadView('pdfs.alcohol-test-acta', [
            'test' => $test,
            'logoSrc' => \App\Support\PdfLogo::dataUri(),
            'signatureSrc' => $signatureSrc,
        ])->setPaper('a4', 'portrait');

        $safeName = preg_replace('/\W+/', '_', $test->driver_name ?: 'conductor');

        return $pdf->download('acta_alcoholimetro_'.$test->id.'_'.$safeName.'.pdf');
    }

    /**
     * @return Builder<AlcoholTestPackage>
     */
    private function scopedPackagesQuery(): Builder
    {
        $query = AlcoholTestPackage::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            // Solo paquetes donde ya hay tests (alerta) de sus unidades.
            $query->whereHas(
                'tests',
                fn (Builder $q) => $q->where('coordinator_id', Auth::id()),
            );
        }

        return $query;
    }

    /**
     * Conteos del paquete; para coordinador solo sus unidades.
     *
     * @return array<string, mixed>
     */
    private function packageTestCounts(?int $coordinatorId): array
    {
        $forCoordinator = function (Builder $q) use ($coordinatorId): void {
            if ($coordinatorId !== null) {
                $q->where('coordinator_id', $coordinatorId);
            }
        };

        return [
            'tests' => $forCoordinator,
            'tests as positive_count' => function (Builder $q) use ($forCoordinator): void {
                $forCoordinator($q);
                $q->where('is_positive', true);
            },
            'tests as pending_count' => function (Builder $q) use ($forCoordinator): void {
                $forCoordinator($q);
                $q
                    ->where('is_positive', true)
                    ->where('coordinator_status', AlcoholTest::STATUS_PENDING);
            },
        ];
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
    private function toTestItem(AlcoholTest $test): array
    {
        $canRespond = $test->canCoordinatorRespond()
            && Auth::user()?->can('alcoholtests.respond')
            && (
                ! SystemRoles::currentIsScopedCoordinator()
                || (int) $test->coordinator_id === (int) Auth::id()
            );

        return [
            'id' => $test->id,
            'package_id' => $test->package_id,
            'tested_at' => optional($test->tested_at)?->toIso8601String(),
            'driver_name' => $test->driver_name,
            'driver_dni' => $test->driver_dni,
            'plate_number' => $test->plate_number,
            'alcohol_level' => (float) $test->alcohol_level,
            'is_positive' => $test->is_positive,
            'location' => $test->location,
            'notes' => $test->notes,
            'coordinator_status' => $test->coordinator_status,
            'coordinator_action_plan' => $test->coordinator_action_plan,
            'coordinator_signer_name' => $test->coordinator_signer_name,
            'coordinator_signature_url' => $test->coordinatorSignatureUrl(),
            'coordinator_signed_at' => optional($test->coordinator_signed_at)?->toIso8601String(),
            'can_respond' => $canRespond,
            'coordinator' => $test->coordinator
                ? ['id' => $test->coordinator->id, 'name' => $test->coordinator->name]
                : null,
        ];
    }

    private function ensureCanAccessPackage(AlcoholTestPackage $package): void
    {
        if (! SystemRoles::currentIsScopedCoordinator()) {
            return;
        }

        $owns = $package->tests()
            ->where('coordinator_id', Auth::id())
            ->exists();

        if (! $owns && $package->tests()->exists()) {
            abort(403, 'No tienes acceso a este paquete de alcohómetro.');
        }
    }

    private function ensureCanAccessTest(AlcoholTest $test): void
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
