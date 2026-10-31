<?php

namespace App\Http\Controllers;

use App\Http\Requests\InductionRequest;
use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Period;
use App\Models\Place;
use App\Models\Site;
use App\Models\Unit;
use App\Support\DriverInductionArchive;
use App\Support\DriverInductionLookup;
use App\Support\InductionAttendeeStatuses;
use App\Support\InductionDocumentSettings;
use App\Support\InductionFormOptions;
use App\Support\InductionReportExporter;
use App\Support\InductionStatuses;
use App\Support\InductionTypeCatalog;
use App\Support\SystemRoles;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DriverInductionReportController extends Controller
{
    public function index(): Response
    {
        return $this->page([
            'dnis' => '',
            'rows' => [],
            'summary' => null,
            'truncated' => false,
            'dniCount' => 0,
        ]);
    }

    public function search(Request $request, DriverInductionLookup $lookup): Response
    {
        $dnis = $this->dnis($request);
        $report = $lookup->build($dnis);

        return $this->page([
            'dnis' => $dnis,
            'rows' => $report['rows'],
            'summary' => $report['summary'],
            'truncated' => $report['truncated'],
            'dniCount' => $report['dni_count'],
        ]);
    }

    public function complete(InductionRequest $request): RedirectResponse
    {
        $extra = $request->validate([
            'drivers' => ['required', 'array', 'min:1'],
            'drivers.*.dni' => ['required', 'string', 'max:32'],
            'drivers.*.name' => ['nullable', 'string', 'max:255'],
            'close_on_create' => ['sometimes', 'boolean'],
        ], [
            'drivers.required' => 'No hay conductores para esta actividad.',
        ]);

        $close = $request->boolean('close_on_create');
        $data = InductionDocumentSettings::stamp($this->payloadFromValidated($request->validated()));
        $data['status'] = $close ? InductionStatuses::CLOSED : InductionStatuses::SCHEDULED;
        $data['created_by'] = Auth::id();
        $data['closed_at'] = $close ? now() : null;

        $induction = DB::transaction(function () use ($data, $extra, $close) {
            $induction = Induction::query()->create($data);
            $induction->update([
                'acta_number' => str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT),
            ]);

            $this->attachDrivers($induction, $extra['drivers'], $close);

            return $induction;
        });

        $count = $induction->attendees()->count();
        $message = $close
            ? "Se creó y cerró «{$induction->title}» con {$count} conductor(es)."
            : "Se creó «{$induction->title}» programada con {$count} conductor(es).";

        return back()->with('toast', [
            'type' => 'success',
            'message' => $message,
        ]);
    }

    public function document(Request $request, DriverInductionArchive $archive): HttpResponse|JsonResponse
    {
        $validated = $request->validate([
            'dni' => ['required', 'string', 'max:32'],
            'induction_id' => ['required', 'integer', 'min:1'],
            'doc' => ['required', 'in:acta,risst,ritran'],
        ]);

        try {
            return $archive->preview(
                $validated['dni'],
                (int) $validated['induction_id'],
                $validated['doc'],
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => mb_substr($e->getMessage(), 0, 180),
            ], 500);
        }
    }

    public function excel(
        Request $request,
        DriverInductionLookup $lookup,
        InductionReportExporter $exporter,
    ): StreamedResponse {
        $digits = array_column($lookup->parse($this->dnis($request)), 'key');

        $units = Unit::query()
            ->with([
                'period:id,date,status',
                'coordinatorUser:id,name',
                'coordinatorUser.places.site:id,name',
            ]);

        if ($digits !== []) {
            $placeholders = implode(', ', array_fill(0, count($digits), '?'));
            $units->whereRaw(
                "regexp_replace(coalesce(driver_dni, ''), '[^0-9]', '', 'g') in ({$placeholders})",
                $digits,
            );
        } else {
            $units->whereRaw('1 = 0');
        }

        if (SystemRoles::currentIsScopedCoordinator()) {
            $units->where('coordinator_id', Auth::id());
        }

        $inductions = Induction::query()
            ->with('attendees')
            ->where('status', '!=', InductionStatuses::CANCELLED)
            ->orderBy('scheduled_at')
            ->get();

        return $exporter->download($inductions, $units->get(), $digits);
    }

    public function archive(Request $request, DriverInductionArchive $archive): HttpResponse|BinaryFileResponse|JsonResponse
    {
        $validated = $request->validate([
            'groups' => ['required', 'array', 'min:1'],
            'groups.*.induction_id' => ['required', 'integer', 'min:1'],
            'groups.*.include' => ['required', 'array', 'min:1'],
            'groups.*.include.*' => ['in:acta,risst,ritran'],
            'groups.*.dnis' => ['required', 'array', 'min:1'],
            'groups.*.dnis.*' => ['required', 'string', 'max:32'],
        ], [
            'groups.required' => 'Marca al menos una inducción.',
        ]);

        try {
            return $archive->respond($validated['groups']);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => mb_substr($e->getMessage(), 0, 180),
            ], 500);
        }
    }

    private function dnis(Request $request): string
    {
        $validated = $request->validate([
            'dnis' => ['required', 'string', 'max:30000'],
        ], [
            'dnis.required' => 'Pega al menos un DNI.',
        ]);

        return $validated['dnis'];
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function page(array $extra): Response
    {
        $map = static fn (array $items) => collect($items)
            ->map(fn (string $label, string $value) => compact('value', 'label'))
            ->values()
            ->all();

        return Inertia::render('driver-report/index', array_merge([
            'periodOptions' => Period::query()->orderByDesc('date')->get(['id', 'name', 'status', 'date']),
            'formOptions' => [
                'types' => InductionTypeCatalog::options(),
                'activities' => $map(InductionFormOptions::activities()),
                'modalities' => $map(InductionFormOptions::modalities()),
                'schools' => $map(InductionFormOptions::schools()),
                'categories' => $map(InductionFormOptions::categories()),
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
        ], $extra));
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

        unset($data['regulations'], $data['drivers'], $data['close_on_create']);

        $typeSlug = (string) ($data['induction_type'] ?? '');
        $type = InductionTypeCatalog::get($typeSlug);

        if ($type) {
            $data['induction_type'] = $type['slug'];
            $data['title'] = $type['title'];
            $data['activity'] = $type['activity'];
        }

        $site = ! empty($data['site_id']) ? Site::query()->find($data['site_id']) : null;
        $place = ! empty($data['place_id']) ? Place::query()->find($data['place_id']) : null;

        if ($site) {
            $data['site_id'] = $site->id;
            $data['sede'] = $site->name;
            $data['location'] = $site->name;
        } else {
            $data['site_id'] = null;
            $data['location'] = $data['sede'] ?? null;
        }

        if ($site && $place && (int) $place->site_id === (int) $site->id) {
            $data['place_id'] = $place->id;
            $data['zone'] = $place->name;
        } else {
            $data['place_id'] = null;
        }

        $data['scheduled_at'] = $scheduledAt;
        $data['start_time'] = strlen($start) === 5 ? "{$start}:00" : $start;
        $data['end_time'] = strlen($end) === 5 ? "{$end}:00" : $end;
        $data['notes'] = $data['temario'] ?? null;

        return $data;
    }

    /**
     * @param  list<array{dni: string, name?: string|null}>  $drivers
     */
    private function attachDrivers(Induction $induction, array $drivers, bool $close): void
    {
        $digits = [];

        foreach ($drivers as $driver) {
            $key = preg_replace('/\D+/', '', (string) $driver['dni']) ?? '';

            if (strlen($key) >= 6 && ! isset($digits[$key])) {
                $digits[$key] = $driver;
            }
        }

        if ($digits === []) {
            return;
        }

        $keys = array_keys($digits);
        $placeholders = implode(', ', array_fill(0, count($keys), '?'));
        $status = $close ? InductionAttendeeStatuses::ATTENDED : InductionAttendeeStatuses::REGISTERED;

        $units = Unit::query()
            ->whereRaw(
                "regexp_replace(coalesce(driver_dni, ''), '[^0-9]', '', 'g') in ({$placeholders})",
                $keys,
            )
            ->orderByDesc('id')
            ->get();

        $unitByDni = [];

        foreach ($units as $unit) {
            $key = preg_replace('/\D+/', '', (string) $unit->driver_dni) ?? '';

            if ($key !== '' && ! isset($unitByDni[$key])) {
                $unitByDni[$key] = $unit;
            }
        }

        $prior = InductionAttendee::query()
            ->whereRaw(
                "regexp_replace(coalesce(driver_dni, ''), '[^0-9]', '', 'g') in ({$placeholders})",
                $keys,
            )
            ->orderByDesc('id')
            ->get();

        $priorByDni = [];

        foreach ($prior as $attendee) {
            $key = preg_replace('/\D+/', '', (string) $attendee->driver_dni) ?? '';

            if ($key !== '' && ! isset($priorByDni[$key])) {
                $priorByDni[$key] = $attendee;
            }
        }

        foreach ($digits as $key => $driver) {
            $unit = $unitByDni[$key] ?? null;
            $fallback = $priorByDni[$key] ?? null;
            $name = trim((string) ($driver['name'] ?? ''))
                ?: (string) ($unit?->driver_name ?? $fallback?->driver_name ?? $key);

            InductionAttendee::query()->create([
                'induction_id' => $induction->id,
                'unit_id' => $unit?->id ?? $fallback?->unit_id,
                'driver_name' => $name !== '' ? $name : $key,
                'area_cargo' => 'CONDUCTOR',
                'driver_dni' => $unit?->driver_dni ?: ($fallback?->driver_dni ?: $key),
                'plate_number' => $unit?->plate_number ?? $fallback?->plate_number,
                'phone' => $unit?->phone ?? $fallback?->phone,
                'provider' => $unit?->provider ?? $fallback?->provider,
                'correlative' => $unit?->correlative ?? $fallback?->correlative,
                'status' => $status,
                'attended_at' => $close ? now() : null,
            ]);
        }
    }
}
