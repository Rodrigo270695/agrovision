<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserLocationPing;
use App\Models\UserPresence;
use App\Support\ActivityLogger;
use App\Support\SystemRoles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);
        $hasAlert = $this->hasAlertColumn();

        $logs = $this->filtered($filters)
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ActivityLog $log) => $this->logPayload($log, $hasAlert));

        $since = now()->subMinutes(20);
        $presenceRows = UserPresence::query()
            ->latest('last_seen_at')
            ->limit(200)
            ->get();
        $roles = $this->roleMap($presenceRows->pluck('user_id'));
        $presences = $presenceRows->map(fn (UserPresence $row) => $this->presencePayload($row, $since, $roles));

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
            'weekDays' => $this->weekDays(),
            'peopleToday' => $this->peopleToday(),
            'trails' => $this->trails(),
            'people' => ActivityLog::query()
                ->whereNotNull('user_id')
                ->select('user_id', 'user_name')
                ->distinct()
                ->orderBy('user_name')
                ->limit(300)
                ->get()
                ->map(fn (ActivityLog $log) => [
                    'user_id' => (int) $log->user_id,
                    'user_name' => $log->user_name ?: 'Usuario',
                ])
                ->values(),
            'alerts' => $this->alerts($hasAlert),
            'shifts' => $this->shifts($filters),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $hasAlert = $this->hasAlertColumn();
        $logs = $this->filtered($filters)->latest('created_at')->limit(8000)->get();
        $sheet = new Spreadsheet;
        $grid = $sheet->getActiveSheet();
        $grid->setTitle('Auditoría');
        $headers = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Registro', 'Alerta', 'Detalle', 'IP', 'Navegador'];

        foreach ($headers as $index => $header) {
            $grid->setCellValue([$index + 1, 1], $header);
        }

        $row = 2;

        foreach ($logs as $log) {
            $grid->setCellValue([1, $row], optional($log->created_at)?->timezone(config('app.timezone'))->format('d/m/Y H:i'));
            $grid->setCellValue([2, $row], $log->user_name ?: 'Sistema');
            $grid->setCellValue([3, $row], $log->action);
            $grid->setCellValue([4, $row], $log->module);
            $grid->setCellValue([5, $row], $log->record_code);
            $grid->setCellValue([6, $row], $hasAlert && $log->is_alert ? 'Sí' : '');
            $grid->setCellValue([7, $row], $hasAlert ? $log->alert_reason : null);
            $grid->setCellValue([8, $row], $log->ip);
            $grid->setCellValue([9, $row], $log->browser);
            $row++;
        }

        $filename = 'auditoria-'.now()->format('Y-m-d').'.xlsx';

        return response()->streamDownload(function () use ($sheet): void {
            (new Xlsx($sheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function syncReport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'synced' => ['required', 'integer', 'min:0', 'max:500'],
            'failed' => ['required', 'integer', 'min:0', 'max:500'],
            'pending' => ['required', 'integer', 'min:0', 'max:5000'],
            'message' => ['nullable', 'string', 'max:180'],
        ]);

        $failed = (int) $data['failed'];

        ActivityLogger::write([
            'action' => 'sync',
            'module' => 'Offline',
            'record_code' => $data['synced'].' ok / '.$failed.' error',
            'is_alert' => $failed > 0,
            'alert_reason' => $failed > 0
                ? 'La sincronización dejó '.$failed.' pendientes con error'
                : null,
            'changes' => [
                ['field' => 'enviados', 'before' => null, 'after' => (string) $data['synced']],
                ['field' => 'fallidos', 'before' => null, 'after' => (string) $failed],
                ['field' => 'en_cola', 'before' => null, 'after' => (string) $data['pending']],
                ['field' => 'detalle', 'before' => null, 'after' => $data['message'] ?? null],
            ],
        ]);

        return response()->json(['ok' => true]);
    }

    public function live(): JsonResponse
    {
        $since = now()->subMinutes(20);
        $presenceRows = UserPresence::query()
            ->latest('last_seen_at')
            ->limit(200)
            ->get();
        $roles = $this->roleMap($presenceRows->pluck('user_id'));
        $presences = $presenceRows->map(fn (UserPresence $row) => $this->presencePayload($row, $since, $roles));

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
     * @return array{search: string, action: string, module: string, user: string, from: string, to: string}
     */
    private function filters(Request $request): array
    {
        $user = (int) $request->query('user', 0);

        return [
            'search' => trim((string) $request->query('search', '')),
            'action' => (string) $request->query('action', ''),
            'module' => (string) $request->query('module', ''),
            'user' => $user > 0 ? (string) $user : '',
            'from' => $this->day($request->query('from')),
            'to' => $this->day($request->query('to')),
        ];
    }

    /**
     * @param  array{search: string, action: string, module: string, user: string, from: string, to: string}  $filters
     * @return Builder<ActivityLog>
     */
    private function filtered(array $filters): Builder
    {
        return ActivityLog::query()
            ->when($filters['search'] !== '', function (Builder $query) use ($filters) {
                $term = '%'.$filters['search'].'%';
                $query->where(function (Builder $inner) use ($term) {
                    $inner->where('user_name', 'ilike', $term)
                        ->orWhere('record_code', 'ilike', $term)
                        ->orWhere('module', 'ilike', $term)
                        ->orWhere('ip', 'ilike', $term);
                });
            })
            ->when($filters['action'] !== '', fn (Builder $query) => $query->where('action', $filters['action']))
            ->when($filters['module'] !== '', fn (Builder $query) => $query->where('module', $filters['module']))
            ->when($filters['user'] !== '', fn (Builder $query) => $query->where('user_id', (int) $filters['user']))
            ->when($filters['from'] !== '', fn (Builder $query) => $query->where('created_at', '>=', Carbon::parse($filters['from'])->startOfDay()))
            ->when($filters['to'] !== '', fn (Builder $query) => $query->where('created_at', '<=', Carbon::parse($filters['to'])->endOfDay()));
    }

    /**
     * @return array<string, mixed>
     */
    private function logPayload(ActivityLog $log, bool $hasAlert): array
    {
        return [
            'id' => $log->id,
            'created_at' => optional($log->created_at)?->timezone(config('app.timezone'))->format('d/m/Y, h:i a'),
            'user_name' => $log->user_name ?: 'Sistema',
            'action' => $log->action,
            'module' => $log->module,
            'record_code' => $log->record_code,
            'changes' => $log->changes ?? [],
            'ip' => $log->ip,
            'browser' => $log->browser,
            'is_alert' => $hasAlert && (bool) $log->is_alert,
            'alert_reason' => $hasAlert ? $log->alert_reason : null,
        ];
    }

    private function hasAlertColumn(): bool
    {
        return Schema::hasColumn('activity_logs', 'is_alert');
    }

    private function day(mixed $value): string
    {
        $raw = trim((string) $value);

        if ($raw === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            return '';
        }

        return $raw;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function alerts(bool $hasAlert): array
    {
        $query = ActivityLog::query()->latest('created_at');

        if ($hasAlert) {
            $query->where(function (Builder $inner) {
                $inner->where('is_alert', true)
                    ->orWhere(function (Builder $deleted) {
                        $deleted->where('action', 'deleted')
                            ->whereIn('module', ['Inspecciones', 'Inducciones', 'Usuarios', 'Roles']);
                    });
            });
        } else {
            $query->where('action', 'deleted')
                ->whereIn('module', ['Inspecciones', 'Inducciones', 'Usuarios', 'Roles']);
        }

        return $query->limit(40)->get()
            ->map(fn (ActivityLog $log) => $this->logPayload($log, $hasAlert))
            ->all();
    }

    /**
     * @param  array{search: string, action: string, module: string, user: string, from: string, to: string}  $filters
     * @return list<array<string, mixed>>
     */
    private function shifts(array $filters): array
    {
        $from = $filters['from'] !== ''
            ? Carbon::parse($filters['from'])->startOfDay()
            : now()->startOfDay();
        $to = $filters['to'] !== ''
            ? Carbon::parse($filters['to'])->endOfDay()
            : now()->endOfDay();

        $logins = ActivityLog::query()
            ->where('action', 'login')
            ->when($filters['user'] !== '', fn (Builder $query) => $query->where('user_id', (int) $filters['user']))
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        if ($logins->isEmpty()) {
            return [];
        }

        $userIds = $logins->pluck('user_id')->filter()->unique()->values();
        $logouts = ActivityLog::query()
            ->where('action', 'logout')
            ->whereIn('user_id', $userIds)
            ->where('created_at', '>=', $from)
            ->orderBy('created_at')
            ->get()
            ->groupBy('user_id');
        $presences = UserPresence::query()
            ->whereIn('user_id', $userIds)
            ->get()
            ->keyBy('user_id');
        $zone = (string) config('app.timezone');

        return $logins->map(function (ActivityLog $login) use ($logouts, $presences, $zone) {
            $logout = $logouts->get($login->user_id)?->first(
                fn (ActivityLog $row) => $row->created_at !== null
                    && $login->created_at !== null
                    && $row->created_at->greaterThan($login->created_at),
            );
            $presence = $presences->get($login->user_id);

            return [
                'id' => $login->id,
                'user_name' => $login->user_name ?: 'Usuario',
                'started_at' => $login->created_at?->timezone($zone)->format('d/m/Y, h:i a'),
                'ended_at' => $logout?->created_at?->timezone($zone)->format('d/m/Y, h:i a'),
                'last_seen_at' => $presence?->last_seen_at?->timezone($zone)->format('d/m/Y, h:i a'),
                'ip' => $login->ip,
                'open' => $logout === null,
            ];
        })->all();
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
     * @return list<array{label: string, total: int}>
     */
    private function weekDays(): array
    {
        $names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        $zone = (string) config('app.timezone');
        $counts = [];

        try {
            $rows = ActivityLog::query()
                ->where('created_at', '>=', now()->subDays(6)->startOfDay())
                ->selectRaw("to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD') as day, count(*) as total", [$zone])
                ->groupByRaw("to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD')", [$zone])
                ->pluck('total', 'day');

            foreach ($rows as $day => $total) {
                $counts[(string) $day] = (int) $total;
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        $days = [];

        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $days[] = [
                'label' => $names[(int) $day->dayOfWeek].' '.$day->format('d'),
                'total' => $counts[$day->toDateString()] ?? 0,
            ];
        }

        return $days;
    }

    /**
     * @return list<array{name: string, total: int}>
     */
    private function peopleToday(): array
    {
        try {
            return ActivityLog::query()
                ->where('created_at', '>=', now()->startOfDay())
                ->whereNotNull('user_id')
                ->selectRaw('user_id, max(user_name) as user_name, count(*) as total')
                ->groupBy('user_id')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->user_name ?: 'Usuario',
                    'total' => (int) $row->total,
                ])
                ->all();
        } catch (\Throwable $exception) {
            report($exception);

            return [];
        }
    }

    /**
     * @return list<array{user_id: int, user_name: string, points: list<array{latitude: float, longitude: float, at: string}>}>
     */
    private function trails(): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('user_location_pings')) {
            return [];
        }

        try {
            return $this->trailRows();
        } catch (\Throwable $exception) {
            report($exception);

            return [];
        }
    }

    /**
     * @return list<array{user_id: int, user_name: string, role: string, role_label: string, points: list<array{latitude: float, longitude: float, at: string}>}>
     */
    private function trailRows(): array
    {
        $pings = UserLocationPing::query()
            ->where('recorded_at', '>=', now()->subHours(8))
            ->orderBy('recorded_at')
            ->get(['user_id', 'user_name', 'latitude', 'longitude', 'recorded_at']);
        $roles = $this->roleMap($pings->pluck('user_id'));

        return $pings
            ->groupBy('user_id')
            ->map(function ($rows) use ($roles) {
                $points = $rows->take(-40)->values();
                $userId = (int) $points->first()->user_id;
                $role = $roles[$userId] ?? ['role' => 'otro', 'role_label' => 'Sin rol'];

                return [
                    'user_id' => $userId,
                    'user_name' => (string) ($points->last()->user_name ?: 'Usuario'),
                    'role' => $role['role'],
                    'role_label' => $role['role_label'],
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
     * @param  \Illuminate\Support\Collection<int, mixed>  $userIds
     * @return array<int, array{role: string, role_label: string}>
     */
    private function roleMap(\Illuminate\Support\Collection $userIds): array
    {
        $ids = $userIds->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return [];
        }

        try {
            return User::query()
                ->with('roles:id,name')
                ->whereIn('id', $ids)
                ->get()
                ->mapWithKeys(fn (User $user) => [$user->id => $this->roleMeta($user)])
                ->all();
        } catch (\Throwable $exception) {
            report($exception);

            return [];
        }
    }

    /**
     * @param  array<int, array{role: string, role_label: string}>  $roles
     * @return array<string, mixed>
     */
    private function presencePayload(UserPresence $row, CarbonInterface $since, array $roles = []): array
    {
        $role = $roles[(int) $row->user_id] ?? ['role' => 'otro', 'role_label' => 'Sin rol'];

        return [
            'id' => $row->id,
            'user_id' => $row->user_id,
            'user_name' => $row->user_name ?: 'Usuario',
            'role' => $role['role'],
            'role_label' => $role['role_label'],
            'latitude' => $row->latitude,
            'longitude' => $row->longitude,
            'accuracy' => $row->accuracy,
            'ip' => $row->ip,
            'browser' => $row->browser,
            'last_seen_at' => optional($row->last_seen_at)?->timezone(config('app.timezone'))->format('d/m/Y, h:i a'),
            'active' => $row->last_seen_at !== null && $row->last_seen_at->greaterThanOrEqualTo($since),
        ];
    }

    /**
     * @return array{role: string, role_label: string}
     */
    private function roleMeta(?User $user): array
    {
        $names = collect($user?->roles?->pluck('name') ?? [])
            ->map(fn ($name) => mb_strtolower(trim((string) $name)));

        foreach (['superadmin', 'admin', 'coordinador', 'inspector'] as $role) {
            if ($names->contains($role)) {
                return [
                    'role' => $role,
                    'role_label' => $role === 'admin' ? 'Admin' : SystemRoles::label($role),
                ];
            }
        }

        if ($user?->is_support) {
            return ['role' => 'soporte', 'role_label' => 'Soporte'];
        }

        $first = $names->first();

        return [
            'role' => $first ?: 'otro',
            'role_label' => $first ? SystemRoles::label((string) $first) : 'Sin rol',
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
