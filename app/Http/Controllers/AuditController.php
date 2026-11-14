<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\UserLocationPing;
use App\Models\UserPresence;
use App\Support\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->query('search', '')),
            'action' => (string) $request->query('action', ''),
            'module' => (string) $request->query('module', ''),
        ];

        $logs = ActivityLog::query()
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $term = '%'.$filters['search'].'%';
                $query->where(function ($inner) use ($term) {
                    $inner->where('user_name', 'ilike', $term)
                        ->orWhere('record_code', 'ilike', $term)
                        ->orWhere('module', 'ilike', $term)
                        ->orWhere('ip', 'ilike', $term);
                });
            })
            ->when($filters['action'] !== '', fn ($query) => $query->where('action', $filters['action']))
            ->when($filters['module'] !== '', fn ($query) => $query->where('module', $filters['module']))
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ActivityLog $log) => [
                'id' => $log->id,
                'created_at' => optional($log->created_at)?->timezone(config('app.timezone'))->format('d/m/Y, h:i a'),
                'user_name' => $log->user_name ?: 'Sistema',
                'action' => $log->action,
                'module' => $log->module,
                'record_code' => $log->record_code,
                'changes' => $log->changes ?? [],
                'ip' => $log->ip,
                'browser' => $log->browser,
            ]);

        $since = now()->subMinutes(20);
        $presences = UserPresence::query()
            ->latest('last_seen_at')
            ->limit(200)
            ->get()
            ->map(fn (UserPresence $row) => [
                'id' => $row->id,
                'user_id' => $row->user_id,
                'user_name' => $row->user_name ?: 'Usuario',
                'latitude' => $row->latitude,
                'longitude' => $row->longitude,
                'accuracy' => $row->accuracy,
                'ip' => $row->ip,
                'browser' => $row->browser,
                'last_seen_at' => optional($row->last_seen_at)?->timezone(config('app.timezone'))->format('d/m/Y, h:i a'),
                'active' => $row->last_seen_at !== null && $row->last_seen_at->greaterThanOrEqualTo($since),
            ]);

        return Inertia::render('audit/index', [
            'logs' => $logs,
            'filters' => $filters,
            'modules' => ActivityLog::query()->distinct()->orderBy('module')->pluck('module')->values(),
            'presences' => $presences,
            'stats' => [
                'today' => ActivityLog::query()->where('created_at', '>=', now()->startOfDay())->count(),
                'active' => $presences->where('active', true)->count(),
                'located' => $presences->filter(fn (array $row) => $row['latitude'] !== null && $row['longitude'] !== null)->count(),
                'modules' => ActivityLog::query()->where('created_at', '>=', now()->startOfDay())->distinct('module')->count('module'),
            ],
            'moduleSummary' => ActivityLog::query()
                ->selectRaw('module, count(*) as total')
                ->where('created_at', '>=', now()->subDays(7))
                ->groupBy('module')
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'module' => $row->module,
                    'total' => (int) $row->total,
                ]),
            'actionsToday' => $this->actionsToday(),
            'hoursToday' => $this->hoursToday(),
            'trails' => $this->trails(),
        ]);
    }

    public function live(): JsonResponse
    {
        $since = now()->subMinutes(20);
        $presences = UserPresence::query()
            ->latest('last_seen_at')
            ->limit(200)
            ->get()
            ->map(fn (UserPresence $row) => $this->presencePayload($row, $since));

        return response()->json([
            'presences' => $presences,
            'trails' => $this->trails(),
            'active' => $presences->where('active', true)->count(),
            'located' => $presences->filter(fn (array $row) => $row['latitude'] !== null)->count(),
        ]);
    }

    public function presence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0', 'max:100000'],
        ]);

        $user = Auth::user();

        if ($user === null || ! function_exists('tenancy') || ! tenancy()->initialized) {
            return response()->json(['ok' => false], 204);
        }

        if (! \Illuminate\Support\Facades\Schema::hasTable('user_presences')) {
            return response()->json(['ok' => false]);
        }

        $presence = UserPresence::query()->firstOrNew(['user_id' => $user->id]);
        $hadLocation = $presence->latitude !== null;
        $presence->fill([
            'user_name' => $user->name,
            'ip' => $request->ip(),
            'browser' => ActivityLogger::browser($request->userAgent()),
            'user_agent' => $request->userAgent(),
            'last_seen_at' => now(),
        ]);

        if (isset($data['latitude'], $data['longitude'])) {
            $presence->latitude = $data['latitude'];
            $presence->longitude = $data['longitude'];
            $presence->accuracy = isset($data['accuracy']) ? (int) $data['accuracy'] : null;
        }

        $presence->save();

        if (isset($data['latitude'], $data['longitude']) && \Illuminate\Support\Facades\Schema::hasTable('user_location_pings')) {
            $this->storePing($user, (float) $data['latitude'], (float) $data['longitude'], $presence->accuracy);
        }

        if (isset($data['latitude'], $data['longitude']) && ! $hadLocation) {
            ActivityLogger::write([
                'action' => 'location',
                'module' => 'Acceso',
                'record_type' => 'User',
                'record_id' => $user->id,
                'record_code' => $user->email,
                'changes' => [[
                    'field' => 'ubicacion',
                    'before' => null,
                    'after' => round((float) $data['latitude'], 5).', '.round((float) $data['longitude'], 5),
                ]],
            ]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * @return array<string, int>
     */
    private function actionsToday(): array
    {
        return ActivityLog::query()
            ->where('created_at', '>=', now()->startOfDay())
            ->selectRaw('action, count(*) as total')
            ->groupBy('action')
            ->pluck('total', 'action')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    /**
     * @return list<int>
     */
    private function hoursToday(): array
    {
        $buckets = array_fill(0, 24, 0);
        $zone = (string) config('app.timezone');

        ActivityLog::query()
            ->where('created_at', '>=', now()->startOfDay())
            ->get(['created_at'])
            ->each(function (ActivityLog $log) use (&$buckets, $zone): void {
                if ($log->created_at === null) {
                    return;
                }

                $buckets[(int) $log->created_at->timezone($zone)->format('G')]++;
            });

        return $buckets;
    }

    /**
     * @return list<array{user_id: int, user_name: string, points: list<array{latitude: float, longitude: float, at: string}>}>
     */
    private function trails(): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('user_location_pings')) {
            return [];
        }

        return UserLocationPing::query()
            ->where('recorded_at', '>=', now()->subHours(8))
            ->orderBy('recorded_at')
            ->get()
            ->groupBy('user_id')
            ->map(function ($rows) {
                $points = $rows->take(-40)->values();

                return [
                    'user_id' => (int) $points->first()->user_id,
                    'user_name' => (string) ($points->last()->user_name ?: 'Usuario'),
                    'points' => $points->map(fn (UserLocationPing $ping) => [
                        'latitude' => (float) $ping->latitude,
                        'longitude' => (float) $ping->longitude,
                        'at' => optional($ping->recorded_at)?->timezone(config('app.timezone'))->format('H:i'),
                    ])->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function presencePayload(UserPresence $row, \Illuminate\Support\Carbon $since): array
    {
        return [
            'id' => $row->id,
            'user_id' => $row->user_id,
            'user_name' => $row->user_name ?: 'Usuario',
            'latitude' => $row->latitude,
            'longitude' => $row->longitude,
            'accuracy' => $row->accuracy,
            'ip' => $row->ip,
            'browser' => $row->browser,
            'last_seen_at' => optional($row->last_seen_at)?->timezone(config('app.timezone'))->format('d/m/Y, h:i a'),
            'active' => $row->last_seen_at !== null && $row->last_seen_at->greaterThanOrEqualTo($since),
        ];
    }

    private function storePing(\App\Models\User $user, float $latitude, float $longitude, ?int $accuracy): void
    {
        $last = UserLocationPing::query()
            ->where('user_id', $user->id)
            ->latest('recorded_at')
            ->first();

        if ($last !== null) {
            $moved = $this->metersBetween((float) $last->latitude, (float) $last->longitude, $latitude, $longitude);
            $recent = $last->recorded_at !== null && $last->recorded_at->greaterThan(now()->subSeconds(45));

            if ($moved < 25 && $recent) {
                return;
            }
        }

        UserLocationPing::query()->create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'accuracy' => $accuracy,
            'recorded_at' => now(),
        ]);

        if (random_int(1, 30) === 1) {
            UserLocationPing::query()->where('recorded_at', '<', now()->subDays(2))->delete();
        }
    }

    private function metersBetween(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earth * asin(min(1, sqrt($a)));
    }
}
