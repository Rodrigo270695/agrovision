<?php

namespace App\Http\Controllers;

use App\Models\ObservationRemediation;
use App\Models\ObservationRemediationPhoto;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistSignature;
use App\Services\PushNotificationService;
use App\Support\ObservationCalendar;
use App\Support\ObservationListExcel;
use App\Support\ObservationRemediationSupport;
use App\Support\PermissionCatalog;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use App\Support\ParetoPassThreshold;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ObservationRemediationController extends Controller
{
    public function index(Request $request, ObservationCalendar $calendar): Response
    {
        PermissionCatalog::syncToDatabase();

        $validated = $request->validate([
            'year' => ['nullable', 'integer', 'min:2020', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'date' => ['nullable', 'date'],
            'view' => ['nullable', Rule::in(['calendar', 'list'])],
            'search' => ['nullable', 'string', 'max:120'],
            'sede' => ['nullable', 'string', 'max:120'],
            'provider' => ['nullable', 'string', 'max:255'],
            'responsible' => ['nullable', 'string', 'max:255'],
            'grade' => ['nullable', Rule::in(['approved', 'approved_notes', 'rejected'])],
        ]);

        $today = now()->timezone(config('app.timezone'));
        $year = (int) ($validated['year'] ?? $today->year);
        $month = (int) ($validated['month'] ?? $today->month);
        $selectedDate = $validated['date'] ?? null;
        $view = $validated['view'] ?? 'calendar';
        $search = trim((string) ($validated['search'] ?? '')) ?: null;
        $sede = trim((string) ($validated['sede'] ?? '')) ?: null;
        $provider = trim((string) ($validated['provider'] ?? '')) ?: null;
        $responsible = trim((string) ($validated['responsible'] ?? '')) ?: null;
        $grade = $validated['grade'] ?? null;
        $filters = [
            'search' => $search,
            'sede' => $sede,
            'provider' => $provider,
            'responsible' => $responsible,
            'grade' => $grade,
        ];

        $payload = $calendar->month($year, $month, $filters);
        $dayUnits = $selectedDate && $view === 'calendar'
            ? $calendar->dayUnits($selectedDate, $filters)
            : [];
        $listUnits = $view === 'list'
            ? $calendar->actionableList($year, $month, $filters)
            : [];
        $hasTextOrFacetFilter = $search || $sede || $provider || $responsible || $grade;
        $searchUnits = $view === 'calendar' && $hasTextOrFacetFilter
            ? $calendar->searchMonthUnits($year, $month, $filters)
            : [];

        return Inertia::render('observation-remediations/index', [
            'calendar' => $payload,
            'selected_date' => $selectedDate,
            'day_units' => $dayUnits,
            'list_units' => $listUnits,
            'search_units' => $searchUnits,
            'filter_options' => $this->observationFilterOptions(),
            'filters' => [
                'view' => $view,
                'search' => $search ?? '',
                'sede' => $sede ?? '',
                'provider' => $provider ?? '',
                'responsible' => $responsible ?? '',
                'grade' => $grade ?? '',
            ],
            'can_submit' => Auth::user()?->can('observation_remediations.submit') ?? false,
            'can_verify' => Auth::user()?->can('observation_remediations.verify') ?? false,
        ]);
    }

    public function export(Request $request, ObservationCalendar $calendar, ObservationListExcel $excel): StreamedResponse
    {
        $validated = $request->validate([
            'year' => ['nullable', 'integer', 'min:2020', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'search' => ['nullable', 'string', 'max:120'],
            'sede' => ['nullable', 'string', 'max:120'],
            'provider' => ['nullable', 'string', 'max:255'],
            'responsible' => ['nullable', 'string', 'max:255'],
            'grade' => ['nullable', Rule::in(['approved', 'approved_notes', 'rejected'])],
        ]);

        $today = now()->timezone(config('app.timezone'));
        $year = (int) ($validated['year'] ?? $today->year);
        $month = (int) ($validated['month'] ?? $today->month);
        $search = trim((string) ($validated['search'] ?? ''));
        $filters = [
            'search' => $search !== '' ? $search : null,
            'sede' => trim((string) ($validated['sede'] ?? '')) ?: null,
            'provider' => trim((string) ($validated['provider'] ?? '')) ?: null,
            'responsible' => trim((string) ($validated['responsible'] ?? '')) ?: null,
            'grade' => $validated['grade'] ?? null,
        ];

        $rows = $calendar->actionableList($year, $month, $filters);
        $months = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
        ];
        $gradeLabel = match ($filters['grade']) {
            'approved' => 'Aprobados',
            'approved_notes' => 'Aprobados con observación',
            'rejected' => 'Desaprobados',
            default => 'Con observación y desaprobados',
        };
        $parts = array_filter([
            $search !== '' ? $search : null,
            $filters['sede'],
            $filters['provider'],
            $filters['responsible'],
        ]);

        return $excel->download($rows, sprintf('observaciones-%04d-%02d.xlsx', $year, $month), [
            'month' => ($months[$month] ?? '').' '.$year,
            'grade' => $gradeLabel,
            'search' => $parts === [] ? 'Sin búsqueda' : implode(' · ', $parts),
            'generated_at' => $today->format('d/m/Y H:i'),
            'total' => count($rows),
        ]);
    }

    /**
     * @return array{sedes: list<string>, providers: list<string>, responsibles: list<string>}
     */
    private function observationFilterOptions(): array
    {
        $units = Unit::query()
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        if (SystemRoles::currentIsScopedCoordinator()) {
            $units->where('coordinator_id', Auth::id());
        }

        $sedes = (clone $units)
            ->whereNotNull('sede')
            ->where('sede', '!=', '')
            ->distinct()
            ->orderBy('sede')
            ->pluck('sede')
            ->map(fn ($value) => (string) $value)
            ->values()
            ->all();

        $providers = (clone $units)
            ->whereNotNull('provider')
            ->where('provider', '!=', '')
            ->distinct()
            ->orderBy('provider')
            ->pluck('provider')
            ->map(fn ($value) => (string) $value)
            ->values()
            ->all();

        $responsibles = (clone $units)
            ->whereNotNull('responsible_person')
            ->where('responsible_person', '!=', '')
            ->distinct()
            ->orderBy('responsible_person')
            ->pluck('responsible_person')
            ->map(fn ($value) => (string) $value)
            ->values()
            ->all();

        return [
            'sedes' => $sedes,
            'providers' => $providers,
            'responsibles' => $responsibles,
        ];
    }

    public function submit(
        Request $request,
        UnitChecklist $checklist,
        PushNotificationService $push,
    ): RedirectResponse {
        $validated = $request->validate([
            'pass' => ['required', 'regex:/^(first|second|r[1-9][0-9]*)$/'],
            'note' => ['nullable', 'string', 'max:2000'],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
        ]);

        $this->ensureCanAccessChecklist($checklist);
        $pass = $validated['pass'];

        $checklist->load([
            'answers.item',
            'observationRemediations.photos',
            'unit',
            'creator',
        ]);

        $snap = ObservationRemediationSupport::passSnapshot($checklist, $pass);
        if (! ObservationRemediationSupport::isRemediableGrade($snap['grade'])) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Solo se levantan desaprobadas o aprobadas con observaciones.',
            ]);
        }

        $noItems = ObservationRemediationSupport::observationItems($checklist, $pass);
        if ($noItems === []) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No hay ítems en NO para levantar.',
            ]);
        }

        $allowedAnswerIds = collect($noItems)->pluck('id')->map(fn ($id) => (int) $id)->all();

        $remediation = ObservationRemediationSupport::findOrCreate($checklist, $pass);
        if (! $remediation->canSubmit()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Este levantamiento ya fue cerrado por el inspector.',
            ]);
        }

        $isResubmit = $remediation->status === ObservationRemediation::SUBMITTED;

        DB::transaction(function () use ($request, $validated, $remediation, $checklist, $pass, $noItems, $allowedAnswerIds, $isResubmit) {
            $uploadedFor = [];
            $photoFiles = $request->file('photos', []);

            if (is_array($photoFiles)) {
                foreach ($photoFiles as $answerId => $file) {
                    $answerId = (int) $answerId;
                    if ($file === null || ! in_array($answerId, $allowedAnswerIds, true)) {
                        continue;
                    }

                    $previous = ObservationRemediationPhoto::query()
                        ->where('observation_remediation_id', $remediation->id)
                        ->where('unit_checklist_answer_id', $answerId)
                        ->get();

                    foreach ($previous as $old) {
                        Storage::disk($old->disk ?: 'public')->delete($old->path);
                        $old->delete();
                    }

                    $path = $file->store(
                        "observation-remediations/{$remediation->id}/answers/{$answerId}",
                        'public',
                    );

                    ObservationRemediationPhoto::query()->create([
                        'observation_remediation_id' => $remediation->id,
                        'unit_checklist_answer_id' => $answerId,
                        'path' => $path,
                        'disk' => 'public',
                        'mime_type' => $file->getMimeType(),
                        'size' => $file->getSize(),
                        'uploaded_by' => Auth::id(),
                    ]);

                    $uploadedFor[] = $answerId;
                }
            }

            $sentAt = now();
            $note = trim((string) ($validated['note'] ?? '')) ?: null;

            $remediation->update([
                'status' => ObservationRemediation::SUBMITTED,
                'submitted_by' => Auth::id(),
                'submitted_at' => $sentAt,
                'submit_note' => $note ?? $remediation->submit_note,
                'rejection_note' => null,
                'inspector_id' => $remediation->inspector_id ?: $checklist->created_by,
            ]);

            ObservationRemediationSupport::recordEvent(
                $remediation,
                $isResubmit ? 'resubmitted' : 'submitted',
                Auth::id(),
                [
                    'pass' => $pass,
                    'plate' => $checklist->plate_number,
                    'photo_answer_ids' => $uploadedFor,
                    'observations_count' => count($noItems),
                    'submit_note' => $note,
                    'recorded_at' => $sentAt->toIso8601String(),
                ],
            );
        });

        $push->notifyInspectorObservationRemediation($checklist->fresh(), $pass);

        return back()->with('toast', [
            'type' => 'success',
            'message' => $isResubmit
                ? 'Observaciones actualizadas. Fecha y hora registradas en el historial.'
                : 'Levantamiento enviado al inspector.',
        ]);
    }

    public function verify(Request $request, UnitChecklist $checklist): RedirectResponse
    {
        $validated = $request->validate([
            'pass' => ['required', 'regex:/^(first|second|r[1-9][0-9]*)$/'],
            'decision' => ['required', Rule::in(['approve', 'reject'])],
            'note' => ['nullable', 'string', 'max:2000'],
            'checked_ids' => ['nullable', 'array'],
            'checked_ids.*' => ['integer'],
            'new_no_ids' => ['nullable', 'array'],
            'new_no_ids.*' => ['integer'],
            'item_notes' => ['nullable', 'array'],
            'item_notes.*' => ['nullable', 'string', 'max:1000'],
            'reuse_driver' => ['nullable', 'boolean'],
            'driver_name' => ['nullable', 'string', 'max:160'],
            'driver_signature' => ['nullable', 'string'],
            'sst_name' => ['nullable', 'string', 'max:160'],
            'sst_signature' => ['nullable', 'string'],
        ]);

        $pass = $validated['pass'];
        $checklist->load([
            'answers.item',
            'observationRemediations.photos',
            'unit',
        ]);

        $this->ensureCanVerify($checklist);

        $remediation = $checklist->observationRemediations
            ->firstWhere('inspection_pass', $pass);

        if ($remediation === null || $remediation->status !== ObservationRemediation::SUBMITTED) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No hay un levantamiento pendiente de verificación.',
            ]);
        }

        if ($validated['decision'] === 'reject') {
            $note = trim((string) ($validated['note'] ?? ''));
            if ($note === '') {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Indica el motivo del rechazo.',
                ]);
            }

            $rejectedAt = now();

            $remediation->update([
                'status' => ObservationRemediation::REJECTED,
                'rejection_note' => $note,
                'verified_by' => Auth::id(),
                'verified_at' => $rejectedAt,
            ]);

            ObservationRemediationSupport::recordEvent(
                $remediation,
                'rejected',
                Auth::id(),
                [
                    'note' => $note,
                    'pass' => $pass,
                    'recorded_at' => $rejectedAt->toIso8601String(),
                ],
            );

            return back()->with('toast', [
                'type' => 'success',
                'message' => 'Levantamiento rechazado. El coordinador puede corregir y reenviar.',
            ]);
        }

        $snap = ObservationRemediationSupport::passSnapshot($checklist, $pass);
        if (! ObservationRemediationSupport::isRemediableGrade($snap['grade'])) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esta inspección ya no está pendiente de levantamiento.',
            ]);
        }

        $noItems = ObservationRemediationSupport::observationItems($checklist, $pass);
        $requiredIds = collect($noItems)->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $checkedIds = collect($validated['checked_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();

        $newNoIds = collect($validated['new_no_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
        $yesIds = $checklist->answers
            ->filter(fn ($answer) => $answer->first_value === 'yes')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $unknown = array_values(array_diff($checkedIds, $requiredIds));
        $unknownNew = array_values(array_diff($newNoIds, $yesIds));
        if ($unknown !== [] || $unknownNew !== [] || array_intersect($checkedIds, $newNoIds) !== []) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Hay ítems que no se pueden cambiar en esta ronda.',
            ]);
        }

        if ($checkedIds === [] && $newNoIds === []) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Marca al menos un ítem levantado o una observación nueva.',
            ]);
        }

        $reuseDriver = $request->boolean('reuse_driver');
        $sstName = trim((string) ($validated['sst_name'] ?? ''));
        $sstSignature = (string) ($validated['sst_signature'] ?? '');
        $driverName = trim((string) ($validated['driver_name'] ?? ''));
        $driverSignature = (string) ($validated['driver_signature'] ?? '');
        $firstDriver = UnitChecklistSignature::query()
            ->where('unit_checklist_id', $checklist->id)
            ->where('inspection_pass', 'first')
            ->where('slot', 'driver')
            ->whereNotNull('signature_path')
            ->first();

        if ($sstName === '' || ! str_starts_with($sstSignature, 'data:image/')) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Firma el V°B° del inspector para registrar la ronda.',
            ]);
        }

        if ($reuseDriver) {
            if ($firstDriver === null) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'No hay firma del conductor en la primera inspección. Añade nombre y firma.',
                ]);
            }
        } elseif ($driverName === '' || ! str_starts_with($driverSignature, 'data:image/')) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Indica el nombre del conductor y su firma.',
            ]);
        }

        $itemNotes = collect($validated['item_notes'] ?? [])
            ->mapWithKeys(fn ($note, $id) => [(int) $id => trim((string) $note)])
            ->filter(fn ($note) => $note !== '')
            ->all();

        $outcome = ['grade' => 'approved', 'round' => 2];
        $signingRound = max(2, (int) ($checklist->round_number ?? 1));

        DB::transaction(function () use (
            $checklist,
            $pass,
            $remediation,
            $snap,
            $checkedIds,
            $newNoIds,
            $itemNotes,
            $validated,
            $reuseDriver,
            $sstName,
            $sstSignature,
            $driverName,
            $driverSignature,
            $firstDriver,
            $signingRound,
            &$outcome,
        ) {
            $previousResult = $pass === 'first'
                ? $checklist->first_result
                : $checklist->second_result;

            ObservationRemediationSupport::copyFirstIntoSecond($checklist);
            $checklist->load('answers.item');

            $newNos = $newNoIds === []
                ? []
                : ObservationRemediationSupport::applyNewNo($checklist, $newNoIds);
            $changed = $checkedIds === []
                ? []
                : ObservationRemediationSupport::applyCheckedYes($checklist, 'second_value', $checkedIds);
            $checklist->refresh()->load('answers.item');

            $afterSnap = ParetoPassThreshold::snapshot($checklist->answers, 'second_value');
            $grade = ParetoPassThreshold::grade($afterSnap['percent'], $afterSnap['has_no']);
            $stored = $grade === 'rejected' ? 'rejected' : 'approved';

            $usedPasses = $checklist->observationRemediations->pluck('inspection_pass');
            $nextRound = 2;
            while ($usedPasses->contains('r'.$nextRound)) {
                $nextRound++;
            }

            $updates = [
                'first_result' => $stored,
                'second_result' => $stored,
            ];
            if ($checklist->second_inspected_on === null) {
                $updates['second_inspected_on'] = $checklist->first_inspected_on;
                $updates['second_inspected_time'] = $checklist->first_inspected_time;
            }
            if (Schema::hasColumn('unit_checklists', 'round_number')) {
                $updates['round_number'] = $nextRound;
            }
            $checklist->update($updates);

            $verifiedAt = now();

            $remediation->update([
                'status' => ObservationRemediation::VERIFIED,
                'verified_by' => Auth::id(),
                'verified_at' => $verifiedAt,
                'rejection_note' => null,
            ]);

            ObservationRemediationSupport::recordEvent(
                $remediation,
                'verified',
                Auth::id(),
                [
                    'pass' => $pass,
                    'round' => $nextRound,
                    'grade' => $grade,
                    'recorded_at' => $verifiedAt->toIso8601String(),
                    'previous_result' => $previousResult,
                    'new_result' => $stored,
                    'previous_percent' => $snap['percent'],
                    'new_percent' => $afterSnap['percent'],
                    'answers_updated' => $changed,
                    'new_nos' => $newNos,
                    'checked_ids' => $checkedIds,
                    'signing_round' => $signingRound,
                    'driver_name' => $reuseDriver ? $firstDriver?->signer_name : $driverName,
                    'sst_name' => $sstName,
                    'item_notes' => $itemNotes,
                    'note' => trim((string) ($validated['note'] ?? '')) ?: null,
                    'had_observation' => $grade !== 'approved',
                ],
            );

            if ($grade !== 'approved') {
                ObservationRemediationSupport::findOrCreate($checklist, 'r'.$nextRound);
            }

            $this->storeRoundSignatures(
                $checklist,
                'r'.$signingRound,
                $sstName,
                $sstSignature,
                $reuseDriver,
                $firstDriver,
                $driverName,
                $driverSignature,
            );

            $outcome = ['grade' => $grade, 'round' => $signingRound];
        });

        $message = match ($outcome['grade']) {
            'approved' => 'Ronda '.$outcome['round'].' registrada. La inspección quedó aprobada.',
            'rejected' => 'Ronda '.$outcome['round'].' registrada. Sigue desaprobada. Se puede levantar lo que falte.',
            default => 'Ronda '.$outcome['round'].' registrada. Sigue aprobada con observaciones. Se puede levantar lo que falte.',
        };

        return back()->with('toast', [
            'type' => 'success',
            'message' => $message,
        ]);
    }

    public function destroyPhoto(ObservationRemediationPhoto $photo): RedirectResponse
    {
        $photo->load('remediation.checklist.unit');
        $remediation = $photo->remediation;

        if ($remediation === null) {
            abort(404);
        }

        $this->ensureCanAccessChecklist($remediation->checklist);

        if (! $remediation->canSubmit()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede quitar la foto de un levantamiento ya cerrado.',
            ]);
        }

        Storage::disk($photo->disk ?: 'public')->delete($photo->path);
        $photo->delete();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Foto eliminada.',
        ]);
    }

    private function storeRoundSignatures(
        UnitChecklist $checklist,
        string $pass,
        string $sstName,
        string $sstSignature,
        bool $reuseDriver,
        ?UnitChecklistSignature $firstDriver,
        string $driverName,
        string $driverSignature,
    ): void {
        $directory = "checklists/{$checklist->id}/signatures";
        $sstPath = SignatureImage::storeFromDataUrl($sstSignature, $directory);

        UnitChecklistSignature::query()->updateOrCreate(
            [
                'unit_checklist_id' => $checklist->id,
                'inspection_pass' => $pass,
                'slot' => 'sst',
            ],
            [
                'signer_name' => $sstName,
                'signature_path' => $sstPath,
                'signed_at' => now(),
            ],
        );

        if ($reuseDriver && $firstDriver !== null) {
            $extension = pathinfo((string) $firstDriver->signature_path, PATHINFO_EXTENSION) ?: 'jpg';
            $driverPath = trim($directory, '/').'/'.uniqid('firma_', true).'.'.$extension;
            Storage::disk('public')->copy((string) $firstDriver->signature_path, $driverPath);
            $signedName = $firstDriver->signer_name;
        } else {
            $driverPath = SignatureImage::storeFromDataUrl($driverSignature, $directory);
            $signedName = $driverName;
        }

        UnitChecklistSignature::query()->updateOrCreate(
            [
                'unit_checklist_id' => $checklist->id,
                'inspection_pass' => $pass,
                'slot' => 'driver',
            ],
            [
                'signer_name' => $signedName,
                'signature_path' => $driverPath,
                'signed_at' => now(),
            ],
        );
    }

    private function ensureCanAccessChecklist(UnitChecklist $checklist): void
    {
        $checklist->loadMissing('unit');

        if (SystemRoles::currentIsScopedCoordinator()
            && (int) $checklist->unit?->coordinator_id !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a esta inspección.');
        }
    }

    private function ensureCanVerify(UnitChecklist $checklist): void
    {
        $user = Auth::user();
        if ($user === null) {
            abort(403);
        }

        if ($user->hasRole(SystemRoles::SUPERADMIN)) {
            return;
        }

        if (! $user->can('observation_remediations.verify')) {
            abort(403, 'No tienes permiso para verificar levantamientos.');
        }
    }
}
