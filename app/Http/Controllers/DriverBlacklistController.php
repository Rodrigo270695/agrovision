<?php

namespace App\Http\Controllers;

use App\Models\AlcoholTest;
use App\Models\DriverBlacklistEntry;
use App\Models\InductionAttendee;
use App\Models\UnitChecklist;
use App\Support\DriverIdentity;
use App\Support\PermissionCatalog;
use App\Support\PublicDisk;
use App\Support\SignatureImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DriverBlacklistController extends Controller
{
    public function index(Request $request): Response
    {
        PermissionCatalog::syncToDatabase();

        $search = trim((string) $request->input('search', ''));
        $activeOnly = $request->boolean('active', true);

        $query = DriverBlacklistEntry::query()
            ->with(['creator:id,name'])
            ->latest('id');

        if ($activeOnly) {
            $query->whereNull('lifted_at');
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('driver_name', 'ilike', "%{$search}%")
                    ->orWhere('driver_dni', 'ilike', "%{$search}%")
                    ->orWhere('plate_number', 'ilike', "%{$search}%");
            });
        }

        $entries = $query
            ->paginate(20)
            ->withQueryString()
            ->through(fn (DriverBlacklistEntry $entry) => $this->serialize($entry));

        return Inertia::render('driver-blacklist/index', [
            'entries' => $entries,
            'filters' => [
                'search' => $search,
                'active' => $activeOnly,
            ],
            'reasonOptions' => collect(DriverBlacklistEntry::reasonLabels())
                ->map(fn (string $label, string $value) => compact('value', 'label'))
                ->values()
                ->all(),
            'stats' => [
                'active' => DriverBlacklistEntry::query()->whereNull('lifted_at')->count(),
                'total' => DriverBlacklistEntry::query()->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'driver_name' => ['required', 'string', 'max:255'],
            'driver_dni' => ['nullable', 'string', 'max:30'],
            'plate_number' => ['nullable', 'string', 'max:30'],
            'reason_code' => [
                'required',
                'string',
                Rule::in(array_keys(DriverBlacklistEntry::reasonLabels())),
            ],
            'reason_detail' => ['nullable', 'string', 'max:2000'],
            'evidence_photo_data_url' => ['required', 'string'],
            'source' => [
                'nullable',
                'string',
                Rule::in([
                    DriverBlacklistEntry::SOURCE_CHECKLIST,
                    DriverBlacklistEntry::SOURCE_ALCOHOL,
                    DriverBlacklistEntry::SOURCE_INDUCTION,
                    DriverBlacklistEntry::SOURCE_MANUAL,
                ]),
            ],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'unit_checklist_id' => ['nullable', 'integer', 'exists:unit_checklists,id'],
            'alcohol_test_id' => ['nullable', 'integer', 'exists:alcohol_tests,id'],
            'induction_attendee_id' => ['nullable', 'integer', 'exists:induction_attendees,id'],
        ], [
            'driver_name.required' => 'El nombre del conductor es obligatorio.',
            'reason_code.required' => 'Selecciona el motivo.',
            'evidence_photo_data_url.required' => 'Sube una foto como evidencia.',
        ]);

        if (
            $validated['reason_code'] === DriverBlacklistEntry::REASON_OTHER
            && trim((string) ($validated['reason_detail'] ?? '')) === ''
        ) {
            return back()->withErrors([
                'reason_detail' => 'Describe el motivo.',
            ]);
        }

        $name = trim($validated['driver_name']);
        $dni = preg_replace('/\D+/', '', (string) ($validated['driver_dni'] ?? '')) ?: null;
        $identity = DriverIdentity::key($dni, $name);

        if ($identity) {
            $already = DriverBlacklistEntry::query()
                ->whereNull('lifted_at')
                ->where('identity_key', $identity)
                ->exists();

            if ($already) {
                return back()->with('toast', [
                    'type' => 'error',
                    'message' => 'Ese conductor ya está en la lista negra activa.',
                ]);
            }
        }

        try {
            $photoPath = SignatureImage::storeFromDataUrl(
                $validated['evidence_photo_data_url'],
                'driver-blacklist',
            );
        } catch (\Throwable $exception) {
            return back()->withErrors([
                'evidence_photo_data_url' => $exception->getMessage() ?: 'No se pudo guardar la foto.',
            ]);
        }

        $context = $this->resolveContext($validated);

        DriverBlacklistEntry::query()->create([
            'identity_key' => $identity,
            'driver_dni' => $dni,
            'driver_name' => $name,
            'plate_number' => $context['plate_number'] ?: ($validated['plate_number'] ?? null),
            'reason_code' => $validated['reason_code'],
            'reason_detail' => trim((string) ($validated['reason_detail'] ?? '')) ?: null,
            'photo_path' => $photoPath,
            'source' => $validated['source'] ?? DriverBlacklistEntry::SOURCE_MANUAL,
            'unit_id' => $context['unit_id'] ?? ($validated['unit_id'] ?? null),
            'unit_checklist_id' => $validated['unit_checklist_id'] ?? null,
            'alcohol_test_id' => $validated['alcohol_test_id'] ?? null,
            'induction_attendee_id' => $validated['induction_attendee_id'] ?? null,
            'created_by' => Auth::id(),
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => "{$name} fue enviado a la lista negra.",
        ]);
    }

    public function lift(Request $request, DriverBlacklistEntry $entry): RedirectResponse
    {
        if ($entry->lifted_at !== null) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Ese registro ya fue levantado.',
            ]);
        }

        $validated = $request->validate([
            'lift_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry->update([
            'lifted_at' => now(),
            'lifted_by' => Auth::id(),
            'lift_note' => trim((string) ($validated['lift_note'] ?? '')) ?: null,
        ]);

        return back()->with('toast', [
            'type' => 'success',
            'message' => "Se levantó la restricción de {$entry->driver_name}.",
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{unit_id: int|null, plate_number: string|null}
     */
    private function resolveContext(array $validated): array
    {
        $unitId = isset($validated['unit_id']) ? (int) $validated['unit_id'] : null;
        $plate = isset($validated['plate_number']) ? trim((string) $validated['plate_number']) : null;

        if (! empty($validated['unit_checklist_id'])) {
            $checklist = UnitChecklist::query()
                ->with('unit:id,plate_number')
                ->find($validated['unit_checklist_id']);

            if ($checklist) {
                $unitId = $unitId ?: $checklist->unit_id;
                $plate = $plate ?: $checklist->plate_number ?: $checklist->unit?->plate_number;
            }
        }

        if (! empty($validated['alcohol_test_id'])) {
            $test = AlcoholTest::query()->find($validated['alcohol_test_id']);

            if ($test) {
                $unitId = $unitId ?: $test->unit_id;
                $plate = $plate ?: $test->plate_number;
            }
        }

        if (! empty($validated['induction_attendee_id'])) {
            $attendee = InductionAttendee::query()->find($validated['induction_attendee_id']);

            if ($attendee) {
                $unitId = $unitId ?: $attendee->unit_id;
                $plate = $plate ?: $attendee->plate_number;
            }
        }

        return [
            'unit_id' => $unitId,
            'plate_number' => $plate !== '' ? $plate : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(DriverBlacklistEntry $entry): array
    {
        $labels = DriverBlacklistEntry::reasonLabels();

        return [
            'id' => $entry->id,
            'driver_name' => $entry->driver_name,
            'driver_dni' => $entry->driver_dni,
            'plate_number' => $entry->plate_number,
            'reason_code' => $entry->reason_code,
            'reason_label' => $labels[$entry->reason_code] ?? $entry->reason_code,
            'reason_detail' => $entry->reason_detail,
            'photo_url' => PublicDisk::url($entry->photo_path),
            'source' => $entry->source,
            'is_active' => $entry->isActive(),
            'created_at' => optional($entry->created_at)?->toIso8601String(),
            'lifted_at' => optional($entry->lifted_at)?->toIso8601String(),
            'creator_name' => $entry->creator?->name,
        ];
    }
}
