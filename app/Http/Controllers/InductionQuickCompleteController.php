<?php

namespace App\Http\Controllers;

use App\Models\DriverBiometric;
use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Period;
use App\Models\Place;
use App\Models\Site;
use App\Models\Unit;
use App\Support\DriverBiometrics;
use App\Support\InductionAttendeeStatuses;
use App\Support\InductionDocumentSettings;
use App\Support\InductionFormOptions;
use App\Support\InductionQuickComplete;
use App\Support\InductionStatuses;
use App\Support\InductionTypeCatalog;
use App\Support\PermissionCatalog;
use App\Support\SignatureImage;
use App\Support\SystemRoles;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InductionQuickCompleteController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureAllowed();
        PermissionCatalog::syncToDatabase();

        $validated = $request->validate([
            'type' => ['nullable', 'string', Rule::in(InductionTypeCatalog::keys())],
        ]);

        $typeSlug = $validated['type'] ?? null;
        $catalogType = $typeSlug ? InductionTypeCatalog::get($typeSlug) : null;
        $candidates = $typeSlug ? InductionQuickComplete::candidates($typeSlug) : [];

        return Inertia::render('inductions/quick-complete', [
            'selectedType' => $typeSlug,
            'catalogType' => $catalogType ? [
                'slug' => $catalogType['slug'],
                'title' => $catalogType['title'],
                'short' => $catalogType['short'],
                'activity' => $catalogType['activity'],
                'activity_label' => InductionFormOptions::activities()[$catalogType['activity']]
                    ?? $catalogType['activity'],
            ] : null,
            'types' => InductionTypeCatalog::options(),
            'candidates' => $candidates,
            'periodOptions' => Period::query()
                ->orderByDesc('date')
                ->get(['id', 'name', 'status', 'date']),
            'formOptions' => [
                'sites' => Site::query()
                    ->with(['places' => fn ($query) => $query->orderBy('name')])
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn (Site $site) => [
                        'id' => $site->id,
                        'name' => $site->name,
                        'places' => $site->places->map(fn (Place $place) => [
                            'id' => $place->id,
                            'name' => $place->name,
                        ])->values(),
                    ])
                    ->values(),
            ],
            'defaults' => [
                'session_date' => now()->timezone(config('app.timezone'))->format('Y-m-d'),
                'start_time' => '08:00',
                'end_time' => '09:00',
                'speaker_name' => Auth::user()?->name ?? '',
                'speaker_institution' => 'AGROVISION PERÚ SAC',
                'period_id' => Period::query()->orderByDesc('date')->value('id'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureAllowed();

        $validated = $request->validate([
            'induction_type' => ['required', 'string', Rule::in(InductionTypeCatalog::keys())],
            'session_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'period_id' => ['required', 'integer', 'exists:periods,id'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'place_id' => ['nullable', 'integer', 'exists:places,id'],
            'sede' => ['nullable', 'string', 'max:255'],
            'zone' => ['nullable', 'string', 'max:255'],
            'speaker_name' => ['nullable', 'string', 'max:255'],
            'speaker_institution' => ['nullable', 'string', 'max:255'],
            'dnis' => ['required', 'array', 'min:1'],
            'dnis.*' => ['required', 'string', 'max:32'],
            'photo_data_url' => ['required', 'string'],
        ], [
            'induction_type.required' => 'Selecciona el tipo.',
            'dnis.required' => 'Selecciona al menos un conductor.',
            'dnis.min' => 'Selecciona al menos un conductor.',
            'photo_data_url.required' => 'Sube la foto de evidencia.',
            'period_id.required' => 'El periodo es obligatorio.',
            'session_date.required' => 'La fecha es obligatoria.',
        ]);

        if ($request->filled('place_id') && ! $request->filled('site_id')) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Elige la sede antes del lugar.',
            ]);
        }

        $type = InductionTypeCatalog::get($validated['induction_type']);

        if ($type === null) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El tipo no existe.',
            ]);
        }

        $selected = collect($validated['dnis'])
            ->map(fn ($dni) => DriverBiometrics::digits((string) $dni))
            ->filter(fn (string $dni) => strlen($dni) >= 6)
            ->unique()
            ->values();

        $eligible = collect(InductionQuickComplete::candidates($type['slug']))
            ->keyBy('dni');

        $drivers = $selected
            ->map(fn (string $dni) => $eligible->get($dni))
            ->filter()
            ->values();

        if ($drivers->isEmpty()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Ningún conductor seleccionado es elegible (firma + huella y sin ese tipo).',
            ]);
        }

        $date = (string) $validated['session_date'];
        $start = (string) $validated['start_time'];
        $end = (string) $validated['end_time'];
        $scheduledAt = Carbon::parse("{$date} {$start}");

        $site = ! empty($validated['site_id']) ? Site::query()->find($validated['site_id']) : null;
        $place = ! empty($validated['place_id']) ? Place::query()->find($validated['place_id']) : null;

        if ($site && $place && (int) $place->site_id !== (int) $site->id) {
            $place = null;
        }

        try {
            $photoPath = null;

            $induction = DB::transaction(function () use (
                $validated,
                $type,
                $drivers,
                $scheduledAt,
                $date,
                $start,
                $end,
                $site,
                $place,
                &$photoPath,
            ) {
                $payload = InductionDocumentSettings::stamp([
                    'induction_type' => $type['slug'],
                    'title' => $type['title'],
                    'activity' => $type['activity'],
                    'modality' => 'interna',
                    'school' => 'sig',
                    'categories' => ['seguridad_salud_trabajo'],
                    'corrective_action' => false,
                    'session_date' => $date,
                    'start_time' => strlen($start) === 5 ? "{$start}:00" : $start,
                    'end_time' => strlen($end) === 5 ? "{$end}:00" : $end,
                    'estimated_minutes' => max(1, (int) Carbon::parse("{$date} {$start}")->diffInMinutes(Carbon::parse("{$date} {$end}"))),
                    'scheduled_at' => $scheduledAt,
                    'period_id' => (int) $validated['period_id'],
                    'site_id' => $site?->id,
                    'place_id' => $place?->id,
                    'sede' => $site?->name ?? ($validated['sede'] ?? null),
                    'location' => $site?->name ?? ($validated['sede'] ?? null),
                    'zone' => $place?->name ?? ($validated['zone'] ?? null),
                    'speaker_name' => trim((string) ($validated['speaker_name'] ?? '')) ?: null,
                    'speaker_institution' => trim((string) ($validated['speaker_institution'] ?? '')) ?: null,
                    'status' => InductionStatuses::CLOSED,
                    'closed_at' => now(),
                    'created_by' => Auth::id(),
                    'notes' => 'Cierre rápido de faltantes (inspector).',
                ]);

                $induction = Induction::query()->create($payload);
                $induction->update([
                    'acta_number' => str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT),
                ]);

                foreach ($drivers as $driver) {
                    $bio = DriverBiometric::query()->find($driver['biometric_id']);

                    if (! $bio?->signature_path || ! $bio->fingerprint_path) {
                        continue;
                    }

                    $unit = $driver['unit_id']
                        ? Unit::query()->find($driver['unit_id'])
                        : null;

                    InductionAttendee::query()->create([
                        'induction_id' => $induction->id,
                        'unit_id' => $unit?->id,
                        'driver_name' => $driver['name'],
                        'area_cargo' => 'CONDUCTOR',
                        'driver_dni' => $driver['dni'],
                        'plate_number' => $driver['plate'] ?? $unit?->plate_number,
                        'phone' => $unit?->phone,
                        'provider' => $driver['provider'] ?? $unit?->provider,
                        'correlative' => $unit?->correlative,
                        'status' => InductionAttendeeStatuses::ATTENDED,
                        'attended_at' => now(),
                        'signature_path' => DriverBiometrics::copyFile(
                            $bio->signature_path,
                            "inductions/{$induction->id}/signatures",
                        ),
                        'signed_at' => now(),
                        'fingerprint_path' => DriverBiometrics::copyFile(
                            $bio->fingerprint_path,
                            "inductions/{$induction->id}/fingerprints",
                        ),
                        'fingerprint_at' => now(),
                    ]);
                }

                if ($induction->attendees()->count() === 0) {
                    throw new \RuntimeException('No se pudo adjuntar ningún conductor con biometría válida.');
                }

                $photoPath = SignatureImage::storeFromDataUrl(
                    (string) $validated['photo_data_url'],
                    "inductions/{$induction->id}/verification",
                );

                $induction->update([
                    'verification_photo_path' => $photoPath,
                    'verification_photo_at' => now(),
                ]);

                return $induction->fresh(['attendees']);
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->with('toast', [
                'type' => 'error',
                'message' => mb_substr($e->getMessage(), 0, 180),
            ]);
        }

        $count = $induction->attendees->count();

        return redirect()
            ->route('inductions.quick-complete', ['type' => $type['slug']])
            ->with('toast', [
                'type' => 'success',
                'message' => "Paquete cerrado: «{$type['title']}» con {$count} conductor(es).",
            ]);
    }

    private function ensureAllowed(): void
    {
        if (! SystemRoles::currentCanQuickCompleteInductions()) {
            abort(403, 'Solo inspectores y superadmin pueden usar el cierre rápido.');
        }
    }
}
