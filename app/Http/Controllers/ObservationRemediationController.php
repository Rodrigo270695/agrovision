<?php

namespace App\Http\Controllers;

use App\Models\ObservationRemediation;
use App\Models\ObservationRemediationPhoto;
use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Services\PushNotificationService;
use App\Support\ObservationCalendar;
use App\Support\ObservationRemediationSupport;
use App\Support\PermissionCatalog;
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
                'message' => 'Este levantamiento ya fue enviado o verificado.',
            ]);
        }

        DB::transaction(function () use ($request, $validated, $remediation, $checklist, $pass, $noItems, $allowedAnswerIds) {
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

            $remediation->update([
                'status' => ObservationRemediation::SUBMITTED,
                'submitted_by' => Auth::id(),
                'submitted_at' => now(),
                'submit_note' => trim((string) ($validated['note'] ?? '')) ?: null,
                'rejection_note' => null,
                'inspector_id' => $remediation->inspector_id ?: $checklist->created_by,
            ]);

            ObservationRemediationSupport::recordEvent(
                $remediation,
                'submitted',
                Auth::id(),
                [
                    'pass' => $pass,
                    'plate' => $checklist->plate_number,
                    'photo_answer_ids' => $uploadedFor,
                    'observations_count' => count($noItems),
                ],
            );
        });

        $push->notifyInspectorObservationRemediation($checklist->fresh(), $pass);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Levantamiento enviado al inspector.',
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
            'item_notes' => ['nullable', 'array'],
            'item_notes.*' => ['nullable', 'string', 'max:1000'],
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

            $remediation->update([
                'status' => ObservationRemediation::REJECTED,
                'rejection_note' => $note,
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            ObservationRemediationSupport::recordEvent(
                $remediation,
                'rejected',
                Auth::id(),
                ['note' => $note, 'pass' => $pass],
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

        $unknown = array_values(array_diff($checkedIds, $requiredIds));
        if ($checkedIds === [] || $unknown !== []) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Marca al menos un ítem que sigue en NO. Solo se levantan los que marques.',
            ]);
        }

        $itemNotes = collect($validated['item_notes'] ?? [])
            ->mapWithKeys(fn ($note, $id) => [(int) $id => trim((string) $note)])
            ->filter(fn ($note) => $note !== '')
            ->all();

        $outcome = ['grade' => 'approved', 'round' => 2];

        DB::transaction(function () use ($checklist, $pass, $remediation, $snap, $checkedIds, $itemNotes, $validated, &$outcome) {
            $previousResult = $pass === 'first'
                ? $checklist->first_result
                : $checklist->second_result;

            ObservationRemediationSupport::copyFirstIntoSecond($checklist);
            $checklist->load('answers.item');

            $changed = ObservationRemediationSupport::applyCheckedYes($checklist, 'second_value', $checkedIds);
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

            $remediation->update([
                'status' => ObservationRemediation::VERIFIED,
                'verified_by' => Auth::id(),
                'verified_at' => now(),
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
                    'previous_result' => $previousResult,
                    'new_result' => $stored,
                    'previous_percent' => $snap['percent'],
                    'new_percent' => $afterSnap['percent'],
                    'answers_updated' => $changed,
                    'checked_ids' => $checkedIds,
                    'item_notes' => $itemNotes,
                    'note' => trim((string) ($validated['note'] ?? '')) ?: null,
                    'had_observation' => $grade !== 'approved',
                ],
            );

            if ($grade !== 'approved') {
                ObservationRemediationSupport::findOrCreate($checklist, 'r'.$nextRound);
            }

            $outcome = ['grade' => $grade, 'round' => $nextRound];
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
                'message' => 'No se puede quitar la foto de un levantamiento ya enviado.',
            ]);
        }

        Storage::disk($photo->disk ?: 'public')->delete($photo->path);
        $photo->delete();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Foto eliminada.',
        ]);
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
