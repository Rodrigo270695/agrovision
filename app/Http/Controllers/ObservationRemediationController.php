<?php

namespace App\Http\Controllers;

use App\Models\ObservationRemediation;
use App\Models\ObservationRemediationPhoto;
use App\Models\UnitChecklist;
use App\Services\PushNotificationService;
use App\Support\ObservationCalendar;
use App\Support\ObservationRemediationSupport;
use App\Support\PermissionCatalog;
use App\Support\SystemRoles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        ]);

        $today = now()->timezone(config('app.timezone'));
        $year = (int) ($validated['year'] ?? $today->year);
        $month = (int) ($validated['month'] ?? $today->month);
        $selectedDate = $validated['date'] ?? null;

        $payload = $calendar->month($year, $month);
        $dayUnits = $selectedDate ? $calendar->dayUnits($selectedDate) : [];

        return Inertia::render('observation-remediations/index', [
            'calendar' => $payload,
            'selected_date' => $selectedDate,
            'day_units' => $dayUnits,
            'can_submit' => Auth::user()?->can('observation_remediations.submit') ?? false,
            'can_verify' => Auth::user()?->can('observation_remediations.verify') ?? false,
        ]);
    }

    public function submit(
        Request $request,
        UnitChecklist $checklist,
        PushNotificationService $push,
    ): RedirectResponse {
        $validated = $request->validate([
            'pass' => ['required', Rule::in(['first', 'second'])],
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
        if ($snap['grade'] !== 'approved_notes') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Solo se levantan inspecciones aprobadas con observaciones.',
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
            'pass' => ['required', Rule::in(['first', 'second'])],
            'decision' => ['required', Rule::in(['approve', 'reject'])],
            'note' => ['nullable', 'string', 'max:2000'],
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
        if ($snap['grade'] !== 'approved_notes') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esta inspección ya no está en estado con observaciones.',
            ]);
        }

        DB::transaction(function () use ($checklist, $pass, $remediation, $snap) {
            $resultField = $pass === 'second' ? 'second_result' : 'first_result';
            $previousResult = $checklist->{$resultField};

            $changed = ObservationRemediationSupport::applyFullYes($checklist, $pass);
            $checklist->refresh()->load('answers.item');

            $after = ObservationRemediationSupport::passSnapshot($checklist, $pass);
            $checklist->update([
                $resultField => 'approved',
            ]);

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
                    'previous_result' => $previousResult,
                    'new_result' => 'approved',
                    'previous_percent' => $snap['percent'],
                    'new_percent' => $after['percent'],
                    'answers_updated' => $changed,
                    'had_observation' => true,
                ],
            );
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Observaciones verificadas. La inspección queda aprobada.',
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

        if ((int) $checklist->created_by !== (int) $user->id) {
            abort(403, 'Solo el inspector que realizó la inspección puede verificar.');
        }
    }
}
