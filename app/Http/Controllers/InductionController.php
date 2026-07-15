<?php

namespace App\Http\Controllers;

use App\Http\Requests\InductionRequest;
use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Period;
use App\Models\Unit;
use App\Support\IndexedRedirect;
use App\Support\InductionAttendeeStatuses;
use App\Support\InductionDocumentPackage;
use App\Support\InductionFormOptions;
use App\Support\InductionStatuses;
use App\Support\PermissionCatalog;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InductionController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in(InductionStatuses::keys())],
            'sort' => ['nullable', Rule::in(['title', 'scheduled_at', 'status', 'created_at', 'attendees_count'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', Rule::in([5, 10, 25, 50])],
        ]);

        PermissionCatalog::syncToDatabase();

        $search = trim((string) ($validated['search'] ?? ''));
        $status = $validated['status'] ?? null;
        $sort = $validated['sort'] ?? 'scheduled_at';
        $direction = $validated['direction'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $baseQuery = $this->scopedInductionsQuery();

        $query = (clone $baseQuery)->withCount([
            'attendees',
            'attendees as attended_count' => fn ($q) => $q->where('status', InductionAttendeeStatuses::ATTENDED),
        ])->with([
            'period:id,name',
            'creator:id,name',
            'attendees' => fn ($q) => $q
                ->orderBy('driver_name')
                ->select([
                    'id',
                    'induction_id',
                    'driver_name',
                    'driver_dni',
                    'plate_number',
                    'status',
                ]),
        ]);

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('title', 'ilike', "%{$search}%")
                    ->orWhere('location', 'ilike', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        $query->orderBy($sort, $direction);

        $inductions = $query->paginate($perPage)->withQueryString();

        return Inertia::render('inductions/index', [
            'inductions' => $inductions,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'periodOptions' => Period::query()
                ->orderByDesc('date')
                ->get(['id', 'name', 'status', 'date']),
            'statusOptions' => collect(InductionStatuses::labels())
                ->map(fn (string $label, string $value) => compact('value', 'label'))
                ->values()
                ->all(),
            'formOptions' => $this->formOptions(),
            'stats' => [
                'total' => (clone $baseQuery)->count(),
                'scheduled' => (clone $baseQuery)->where('status', InductionStatuses::SCHEDULED)->count(),
                'in_progress' => (clone $baseQuery)->where('status', InductionStatuses::IN_PROGRESS)->count(),
                'closed' => (clone $baseQuery)->where('status', InductionStatuses::CLOSED)->count(),
                'page' => $inductions->currentPage().'/'.max($inductions->lastPage(), 1),
            ],
        ]);
    }

    public function store(InductionRequest $request): RedirectResponse
    {
        $data = $this->payloadFromValidated($request->validated());
        $data['status'] = $data['status'] ?? InductionStatuses::SCHEDULED;
        $data['created_by'] = Auth::id();

        $induction = Induction::query()->create($data);
        $induction->update([
            'acta_number' => str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT),
        ]);

        return IndexedRedirect::toIndex($request, 'inductions.index', [
            'type' => 'success',
            'message' => 'Inducción creada correctamente.',
        ]);
    }

    public function update(InductionRequest $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede editar una inducción cerrada o cancelada.',
            ]);
        }

        $data = $this->payloadFromValidated($request->validated());
        unset($data['status']);

        $induction->update($data);

        return IndexedRedirect::toIndex($request, 'inductions.index', [
            'type' => 'success',
            'message' => 'Inducción actualizada correctamente.',
        ]);
    }

    public function destroy(Request $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->status === InductionStatuses::CLOSED) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se puede eliminar una inducción cerrada.',
            ]);
        }

        $induction->delete();

        return IndexedRedirect::toIndex($request, 'inductions.index', [
            'type' => 'success',
            'message' => 'Inducción eliminada correctamente.',
        ]);
    }

    public function updateStatus(Request $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(InductionStatuses::keys())],
        ]);

        $next = $validated['status'];

        if ($next === InductionStatuses::IN_PROGRESS) {
            if ($induction->status !== InductionStatuses::SCHEDULED) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Solo se puede iniciar una inducción que esté programada.',
                ]);
            }

            if (! $induction->canStartNow()) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Aún no llega la fecha y hora programada. Edita la inducción si necesitas iniciar antes.',
                ]);
            }
        }

        if ($next === InductionStatuses::CLOSED) {
            if ($induction->status !== InductionStatuses::IN_PROGRESS) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Debes iniciar la inducción antes de finalizarla.',
                ]);
            }

            $induction->loadMissing('attendees');

            if ($induction->attendees->isEmpty()) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Agrega y firma asistentes antes de finalizar la inducción.',
                ]);
            }

            if (! $induction->allAttendeesSigned()) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Todos los asistentes deben firmar antes de finalizar.',
                ]);
            }

            if (! $induction->speakerIsSigned()) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'El expositor debe firmar antes de finalizar y cerrar la inducción.',
                ]);
            }

            if (! $induction->hasVerificationPhoto()) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Debes subir la foto de verificación (cámara o galería) antes de finalizar.',
                ]);
            }
        }

        if (
            $induction->status === InductionStatuses::CLOSED
            && $next !== InductionStatuses::SCHEDULED
            && $next !== InductionStatuses::IN_PROGRESS
        ) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Una inducción cerrada solo se puede reabrir como programada o en curso.',
            ]);
        }

        $induction->update([
            'status' => $next,
            'closed_at' => $next === InductionStatuses::CLOSED ? now() : null,
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => match ($next) {
                InductionStatuses::CLOSED => 'Inducción finalizada. Ya puedes descargar el paquete de documentos (ZIP).',
                InductionStatuses::IN_PROGRESS => 'Inducción iniciada. Ya puedes marcar asistencia y capturar firmas.',
                default => 'Estado actualizado: '.InductionStatuses::label($next).'.',
            },
        ]);
    }

    public function show(Request $request, Induction $induction): Response
    {
        $this->ensureCanAccess($induction);

        PermissionCatalog::syncToDatabase();

        $induction->load([
            'period:id,name,status,date',
            'creator:id,name',
            'attendees' => fn ($q) => $q->orderBy('driver_name'),
        ]);

        $search = trim((string) $request->input('unit_search', ''));

        $availableUnits = collect();

        if ($induction->period_id) {
            $availableUnitsQuery = $this->availableUnitsQuery($induction)
                ->where('period_id', $induction->period_id);

            if ($search !== '') {
                $availableUnitsQuery->where(function ($builder) use ($search) {
                    $builder
                        ->where('driver_name', 'ilike', "%{$search}%")
                        ->orWhere('driver_dni', 'ilike', "%{$search}%")
                        ->orWhere('plate_number', 'ilike', "%{$search}%")
                        ->orWhere('correlative', 'ilike', "%{$search}%");
                });
            }

            $availableUnits = $availableUnitsQuery
                ->with('period:id,name')
                ->orderBy('driver_name')
                ->limit(100)
                ->get([
                    'id',
                    'period_id',
                    'correlative',
                    'driver_name',
                    'driver_dni',
                    'plate_number',
                    'phone',
                    'provider',
                ]);
        }

        $inductionPayload = $induction->toArray();
        $inductionPayload['attendees'] = $induction->attendees->map(function (InductionAttendee $attendee) {
            return [
                ...$attendee->toArray(),
                'signature_url' => $attendee->signatureUrl(),
                'fingerprint_url' => $attendee->fingerprintUrl(),
                'is_signed' => $attendee->isSigned(),
                'has_fingerprint' => $attendee->hasFingerprint(),
            ];
        })->values();
        $inductionPayload['all_signed'] = $induction->allAttendeesSigned();
        $inductionPayload['speaker_signed'] = $induction->speakerIsSigned();
        $inductionPayload['speaker_signature_url'] = $induction->speakerSignatureUrl();
        $inductionPayload['has_verification_photo'] = $induction->hasVerificationPhoto();
        $inductionPayload['verification_photo_url'] = $induction->verificationPhotoUrl();
        $inductionPayload['can_finalize'] = $induction->canFinalize();
        $inductionPayload['can_start'] = $induction->canStartNow();
        $inductionPayload['can_manage_attendance'] = $induction->allowsAttendanceActions();

        return Inertia::render('inductions/show', [
            'induction' => $inductionPayload,
            'availableUnits' => $availableUnits,
            'attendeeStatusOptions' => collect(InductionAttendeeStatuses::labels())
                ->map(fn (string $label, string $value) => compact('value', 'label'))
                ->values()
                ->all(),
            'statusOptions' => collect(InductionStatuses::labels())
                ->map(fn (string $label, string $value) => compact('value', 'label'))
                ->values()
                ->all(),
            'formOptions' => $this->formOptions(),
            'unitFilters' => [
                'unit_search' => $search,
            ],
        ]);
    }

    public function pullAttendees(Request $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada o cancelada. No se pueden agregar conductores.',
            ]);
        }

        if (! $induction->period_id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Debes asignar un periodo a la inducción para jalar conductores.',
            ]);
        }

        $validated = $request->validate([
            'unit_ids' => ['required', 'array', 'min:1'],
            'unit_ids.*' => ['integer', 'exists:units,id'],
        ], [
            'unit_ids.required' => 'Selecciona al menos un conductor.',
            'unit_ids.min' => 'Selecciona al menos un conductor.',
        ]);

        $units = $this->availableUnitsQuery($induction)
            ->where('period_id', $induction->period_id)
            ->whereIn('id', $validated['unit_ids'])
            ->get();

        if ($units->isEmpty()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Solo puedes jalar unidades del periodo de esta inducción.',
            ]);
        }

        $added = 0;
        $skipped = 0;

        DB::transaction(function () use ($induction, $units, &$added, &$skipped) {
            foreach ($units as $unit) {
                if (! $unit->driver_name) {
                    $skipped++;

                    continue;
                }

                $existsByUnit = InductionAttendee::query()
                    ->where('induction_id', $induction->id)
                    ->where('unit_id', $unit->id)
                    ->exists();

                if ($existsByUnit) {
                    $skipped++;

                    continue;
                }

                if ($unit->driver_dni) {
                    $existsByDni = InductionAttendee::query()
                        ->where('induction_id', $induction->id)
                        ->where('driver_dni', $unit->driver_dni)
                        ->exists();

                    if ($existsByDni) {
                        $skipped++;

                        continue;
                    }
                }

                InductionAttendee::query()->create([
                    'induction_id' => $induction->id,
                    'unit_id' => $unit->id,
                    'driver_name' => $unit->driver_name,
                    'area_cargo' => 'CONDUCTOR',
                    'driver_dni' => $unit->driver_dni,
                    'plate_number' => $unit->plate_number,
                    'phone' => $unit->phone,
                    'provider' => $unit->provider,
                    'correlative' => $unit->correlative,
                    'status' => InductionAttendeeStatuses::REGISTERED,
                ]);

                $added++;
            }
        });

        if ($induction->status === InductionStatuses::DRAFT && $added > 0) {
            $induction->update(['status' => InductionStatuses::SCHEDULED]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => "Se agregaron {$added} conductor(es)".($skipped > 0 ? " ({$skipped} omitidos)." : '.'),
        ]);
    }

    public function updateAttendee(Request $request, Induction $induction, InductionAttendee $attendee): RedirectResponse
    {
        $this->ensureCanAccess($induction);
        $this->ensureAttendeeBelongs($induction, $attendee);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se puede cambiar la asistencia.',
            ]);
        }

        if (! $induction->allowsAttendanceActions()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Debes iniciar la inducción antes de marcar asistencia.',
            ]);
        }

        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(InductionAttendeeStatuses::keys())],
        ]);

        $payload = [];

        if (array_key_exists('status', $validated) && $validated['status'] !== null) {
            $payload['status'] = $validated['status'];
            $payload['attended_at'] = $validated['status'] === InductionAttendeeStatuses::ATTENDED
                ? now()
                : null;
        }

        if ($payload !== []) {
            $attendee->update($payload);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Asistente actualizado.',
        ]);
    }

    public function bulkUpdateAttendeeStatus(Request $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se puede cambiar la asistencia.',
            ]);
        }

        if (! $induction->allowsAttendanceActions()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Debes iniciar la inducción antes de marcar asistencia.',
            ]);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(InductionAttendeeStatuses::keys())],
        ], [
            'status.required' => 'Indica el estado de asistencia.',
        ]);

        $status = $validated['status'];
        $attendedAt = $status === InductionAttendeeStatuses::ATTENDED ? now() : null;

        $updated = InductionAttendee::query()
            ->where('induction_id', $induction->id)
            ->update([
                'status' => $status,
                'attended_at' => $attendedAt,
            ]);

        $label = InductionAttendeeStatuses::label($status);

        return back()->with('toast', [
            'type' => 'success',
            'message' => $updated > 0
                ? "Se marcó «{$label}» a {$updated} asistente(s)."
                : 'No hay asistentes para actualizar.',
        ]);
    }

    public function signAttendee(Request $request, Induction $induction, InductionAttendee $attendee): RedirectResponse
    {
        $this->ensureCanAccess($induction);
        $this->ensureAttendeeBelongs($induction, $attendee);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se puede firmar.',
            ]);
        }

        if (! $induction->allowsAttendanceActions()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Debes iniciar la inducción antes de capturar firmas y huellas.',
            ]);
        }

        $validated = $request->validate([
            'signature_data_url' => ['required', 'string'],
            'fingerprint_data_url' => ['required', 'string'],
            'clear_signature' => ['nullable', 'boolean'],
        ], [
            'signature_data_url.required' => 'Debes capturar la firma del asistente.',
            'fingerprint_data_url.required' => 'Debes capturar la huella del asistente.',
        ]);

        if (! empty($validated['clear_signature']) && $attendee->signature_path) {
            Storage::disk('public')->delete($attendee->signature_path);
            if ($attendee->fingerprint_path) {
                Storage::disk('public')->delete($attendee->fingerprint_path);
            }
            $attendee->update([
                'signature_path' => null,
                'signed_at' => null,
                'fingerprint_path' => null,
                'fingerprint_at' => null,
            ]);

            return back()->with('toast', [
                'type' => 'success',
                'message' => 'Firma y huella eliminadas.',
            ]);
        }

        if ($attendee->signature_path) {
            Storage::disk('public')->delete($attendee->signature_path);
        }

        if ($attendee->fingerprint_path) {
            Storage::disk('public')->delete($attendee->fingerprint_path);
        }

        $signaturePath = SignatureImage::storeFromDataUrl(
            $validated['signature_data_url'],
            "inductions/{$induction->id}/signatures",
        );

        $fingerprintPath = SignatureImage::storeFromDataUrl(
            $validated['fingerprint_data_url'],
            "inductions/{$induction->id}/fingerprints",
        );

        $attendee->update([
            'signature_path' => $signaturePath,
            'signed_at' => now(),
            'fingerprint_path' => $fingerprintPath,
            'fingerprint_at' => now(),
            'status' => InductionAttendeeStatuses::ATTENDED,
            'attended_at' => $attendee->attended_at ?? now(),
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Firma y huella registradas correctamente.',
        ]);
    }

    public function signSpeaker(Request $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se puede firmar.',
            ]);
        }

        if (! $induction->allowsAttendanceActions()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Debes iniciar la inducción antes de capturar la firma del expositor.',
            ]);
        }

        $validated = $request->validate([
            'signature_data_url' => ['required', 'string'],
        ], [
            'signature_data_url.required' => 'Debes capturar la firma del expositor.',
        ]);

        if ($induction->speaker_signature_path) {
            Storage::disk('public')->delete($induction->speaker_signature_path);
        }

        $path = SignatureImage::storeFromDataUrl(
            $validated['signature_data_url'],
            "inductions/{$induction->id}/speaker",
        );

        $induction->update([
            'speaker_signature_path' => $path,
            'speaker_signed_at' => now(),
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Firma del expositor registrada.',
        ]);
    }

    public function storeVerificationPhoto(Request $request, Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se puede cambiar la foto de verificación.',
            ]);
        }

        if ($induction->status !== InductionStatuses::IN_PROGRESS) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Debes iniciar la inducción antes de subir la foto de verificación.',
            ]);
        }

        $validated = $request->validate([
            'photo_data_url' => ['required', 'string'],
        ], [
            'photo_data_url.required' => 'Debes tomar o subir la foto de verificación.',
        ]);

        $induction->deleteVerificationPhotoFile();

        $path = SignatureImage::storeFromDataUrl(
            $validated['photo_data_url'],
            "inductions/{$induction->id}/verification",
        );

        $induction->update([
            'verification_photo_path' => $path,
            'verification_photo_at' => now(),
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Foto de verificación guardada. Ya puedes finalizar si las firmas están listas.',
        ]);
    }

    public function destroyVerificationPhoto(Induction $induction): RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se puede quitar la foto.',
            ]);
        }

        $induction->deleteVerificationPhotoFile();
        $induction->update([
            'verification_photo_path' => null,
            'verification_photo_at' => null,
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Foto de verificación eliminada.',
        ]);
    }

    public function pdf(Induction $induction): BinaryFileResponse|RedirectResponse
    {
        $this->ensureCanAccess($induction);

        if ($induction->status !== InductionStatuses::CLOSED) {
            return redirect()
                ->route('inductions.show', $induction)
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Solo se puede descargar el paquete cuando la inducción esté finalizada.',
                ]);
        }

        $induction->load(['attendees', 'period']);

        if (! $induction->allAttendeesSigned() || ! $induction->speakerIsSigned()) {
            return redirect()
                ->route('inductions.show', $induction)
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Faltan firmas (asistentes o expositor) para generar los documentos.',
                ]);
        }

        if (! $induction->hasVerificationPhoto()) {
            return redirect()
                ->route('inductions.show', $induction)
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'Falta la foto de verificación para generar los documentos.',
                ]);
        }

        $hasAttendedSigned = $induction->attendees
            ->contains(fn ($attendee) => $attendee->status === InductionAttendeeStatuses::ATTENDED
                && $attendee->isSigned());

        if (! $hasAttendedSigned) {
            return redirect()
                ->route('inductions.show', $induction)
                ->with('toast', [
                    'type' => 'error',
                    'message' => 'No hay conductores que hayan asistido y firmado para generar el paquete.',
                ]);
        }

        return InductionDocumentPackage::download($induction);
    }

    public function destroyAttendee(Induction $induction, InductionAttendee $attendee): RedirectResponse
    {
        $this->ensureCanAccess($induction);
        $this->ensureAttendeeBelongs($induction, $attendee);

        if ($induction->isLocked()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La inducción está cerrada. No se pueden quitar conductores.',
            ]);
        }

        $attendee->delete();

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Conductor retirado de la inducción.',
        ]);
    }

    /**
     * @return Builder<Induction>
     */
    private function scopedInductionsQuery(): Builder
    {
        $query = Induction::query();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('created_by', Auth::id());
        }

        return $query;
    }

    /**
     * @return Builder<Unit>
     */
    private function availableUnitsQuery(Induction $induction): Builder
    {
        $query = Unit::query()
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '');

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->where('coordinator_id', Auth::id());
        }

        $alreadyUnitIds = InductionAttendee::query()
            ->where('induction_id', $induction->id)
            ->whereNotNull('unit_id')
            ->pluck('unit_id');

        if ($alreadyUnitIds->isNotEmpty()) {
            $query->whereNotIn('id', $alreadyUnitIds);
        }

        return $query;
    }

    private function ensureCanAccess(Induction $induction): void
    {
        if (
            SystemRoles::currentIsScopedCoordinator()
            && (int) $induction->created_by !== (int) Auth::id()
        ) {
            abort(403, 'No tienes acceso a esta inducción.');
        }
    }

    private function ensureAttendeeBelongs(Induction $induction, InductionAttendee $attendee): void
    {
        if ((int) $attendee->induction_id !== (int) $induction->id) {
            abort(404);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function payloadFromValidated(array $data): array
    {
        $date = (string) $data['session_date'];
        $start = (string) $data['start_time'];
        $end = (string) $data['end_time'];

        $scheduledAt = Carbon::parse("{$date} {$start}");

        if (empty($data['estimated_minutes'])) {
            try {
                $startAt = Carbon::parse("{$date} {$start}");
                $endAt = Carbon::parse("{$date} {$end}");
                $data['estimated_minutes'] = max(1, (int) $startAt->diffInMinutes($endAt));
            } catch (\Throwable) {
                $data['estimated_minutes'] = null;
            }
        }

        $data['scheduled_at'] = $scheduledAt;
        $data['start_time'] = strlen($start) === 5 ? "{$start}:00" : $start;
        $data['end_time'] = strlen($end) === 5 ? "{$end}:00" : $end;
        $data['location'] = $data['sede'] ?? null;
        $data['notes'] = $data['temario'] ?? null;
        // Un solo código/revisión para acta y comprobante; fechas = sesión
        $data['document_date'] = $date;
        $data['risst_code'] = $data['document_code'] ?? null;
        $data['risst_revision'] = $data['document_revision'] ?? null;
        $data['risst_version'] = $data['document_revision'] ?? null;
        $data['risst_date'] = $date;
        $data['risst_approval_date'] = $date;

        return $data;
    }

    /**
     * @return array{
     *   activities: list<array{value: string, label: string}>,
     *   modalities: list<array{value: string, label: string}>,
     *   schools: list<array{value: string, label: string}>,
     *   categories: list<array{value: string, label: string}>
     * }
     */
    private function formOptions(): array
    {
        $map = static fn (array $items) => collect($items)
            ->map(fn (string $label, string $value) => compact('value', 'label'))
            ->values()
            ->all();

        return [
            'activities' => $map(InductionFormOptions::activities()),
            'modalities' => $map(InductionFormOptions::modalities()),
            'schools' => $map(InductionFormOptions::schools()),
            'categories' => $map(InductionFormOptions::categories()),
        ];
    }
}
