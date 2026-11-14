<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
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
}
