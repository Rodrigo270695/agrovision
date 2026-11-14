<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserLocationPing;
use App\Models\UserPresence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class ActivityLogger
{
    private static bool $writing = false;

    private static ?bool $ready = null;

    private static ?bool $alertsReady = null;

    private static function tableReady(): bool
    {
        if (self::$ready === null) {
            self::$ready = Schema::hasTable('activity_logs');
        }

        return self::$ready;
    }

    private static function alertsReady(): bool
    {
        if (self::$alertsReady === null) {
            self::$alertsReady = Schema::hasColumn('activity_logs', 'is_alert');
        }

        return self::$alertsReady;
    }

    /** @var list<string> */
    private const HIDDEN = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
    ];

    public static function boot(): void
    {
        foreach (['created', 'updated', 'deleted'] as $event) {
            \Illuminate\Support\Facades\Event::listen("eloquent.{$event}: *", function (string $eventName, array $data) use ($event): void {
                $model = $data[0] ?? null;

                if ($model instanceof Model) {
                    self::fromModel($event, $model);
                }
            });
        }
    }

    public static function login(?User $user): void
    {
        $ip = request()?->ip();
        $knownIp = false;
        $hasHistory = false;

        if ($user !== null && $ip && self::tableReady()) {
            $hasHistory = ActivityLog::query()
                ->where('user_id', $user->getKey())
                ->where('action', 'login')
                ->exists();
            $knownIp = ActivityLog::query()
                ->where('user_id', $user->getKey())
                ->where('action', 'login')
                ->where('ip', $ip)
                ->exists();
        }

        $newIp = $hasHistory && ! $knownIp;

        self::write([
            'action' => 'login',
            'module' => 'Acceso',
            'record_type' => 'User',
            'record_id' => $user?->getKey(),
            'record_code' => $user?->email,
            'user_id' => $user?->getKey(),
            'user_name' => $user?->name,
            'is_alert' => $newIp,
            'alert_reason' => $newIp ? 'Ingresó desde una IP nueva' : null,
        ]);
    }

    public static function logout(?User $user): void
    {
        self::write([
            'action' => 'logout',
            'module' => 'Acceso',
            'record_type' => 'User',
            'record_id' => $user?->getKey(),
            'record_code' => $user?->email,
            'user_id' => $user?->getKey(),
            'user_name' => $user?->name,
        ]);
    }

    public static function fromModel(string $event, Model $model): void
    {
        if ($model instanceof ActivityLog || $model instanceof UserPresence || $model instanceof UserLocationPing) {
            return;
        }

        if (! str_starts_with($model::class, 'App\\Models\\')) {
            return;
        }

        $changes = $event === 'updated' ? self::diff($model) : self::snapshot($model, $event === 'deleted');

        if ($event === 'updated' && $changes === []) {
            return;
        }

        $sensitiveDelete = $event === 'deleted' && in_array(class_basename($model), [
            'UnitChecklist',
            'Induction',
            'User',
            'Role',
        ], true);

        self::write([
            'action' => $event,
            'module' => self::module($model),
            'record_type' => class_basename($model),
            'record_id' => $model->getKey(),
            'record_code' => self::code($model),
            'changes' => $changes,
            'is_alert' => $sensitiveDelete,
            'alert_reason' => $sensitiveDelete ? 'Se eliminó un registro de '.self::module($model) : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    public static function write(array $extra): void
    {
        if (self::$writing || ! function_exists('tenancy') || ! tenancy()->initialized) {
            return;
        }

        if (self::$ready === false) {
            return;
        }

        self::$writing = true;

        try {
            if (self::$ready === null) {
                self::$ready = Schema::hasTable('activity_logs');
            }

            if (! self::$ready) {
                return;
            }

            $request = request();
            $user = Auth::user();
            $row = [
                'user_id' => $extra['user_id'] ?? $user?->getKey(),
                'user_name' => $extra['user_name'] ?? $user?->name,
                'action' => $extra['action'],
                'module' => $extra['module'],
                'record_type' => $extra['record_type'] ?? null,
                'record_id' => isset($extra['record_id']) ? (string) $extra['record_id'] : null,
                'record_code' => isset($extra['record_code']) ? Str::limit((string) $extra['record_code'], 160, '') : null,
                'changes' => $extra['changes'] ?? null,
                'ip' => $request?->ip(),
                'browser' => self::browser($request?->userAgent()),
                'user_agent' => $request?->userAgent() ? Str::limit($request->userAgent(), 500, '') : null,
                'url' => $request?->path() ? Str::limit('/'.$request->path(), 255, '') : null,
                'created_at' => now(),
            ];

            if (self::alertsReady()) {
                $row['is_alert'] = (bool) ($extra['is_alert'] ?? false);
                $row['alert_reason'] = $extra['alert_reason'] ?? null;
            }

            ActivityLog::query()->create($row);
        } catch (\Throwable) {
            self::$ready = null;
        } finally {
            self::$writing = false;
        }
    }

    /**
     * @return list<array{field: string, before: ?string, after: ?string}>
     */
    private static function diff(Model $model): array
    {
        $rows = [];

        foreach ($model->getChanges() as $field => $after) {
            if (in_array($field, ['updated_at', 'created_at', ...self::HIDDEN], true)) {
                continue;
            }

            $rows[] = [
                'field' => $field,
                'before' => self::clip($model->getOriginal($field)),
                'after' => self::clip($after),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array{field: string, before: ?string, after: ?string}>
     */
    private static function snapshot(Model $model, bool $deleted): array
    {
        $rows = [];
        $source = $deleted ? $model->getOriginal() : $model->getAttributes();

        foreach ($source as $field => $value) {
            if (in_array($field, ['id', 'updated_at', 'created_at', ...self::HIDDEN], true) || $value === null || $value === '') {
                continue;
            }

            $rows[] = [
                'field' => $field,
                'before' => $deleted ? self::clip($value) : null,
                'after' => $deleted ? null : self::clip($value),
            ];

            if (count($rows) >= 12) {
                break;
            }
        }

        return $rows;
    }

    private static function clip(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_bool($value)) {
            return $value ? 'sí' : 'no';
        }

        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        $text = trim((string) $value);

        if ($text === '' || str_starts_with($text, 'data:image')) {
            return str_starts_with($text, 'data:image') ? '[imagen]' : null;
        }

        return Str::limit($text, 120, '…');
    }

    private static function code(Model $model): string
    {
        foreach (['plate_number', 'code', 'acta_number', 'name', 'email', 'title', 'driver_name', 'document_number'] as $field) {
            $value = $model->getAttribute($field);

            if (filled($value) && ! str_starts_with((string) $value, 'data:')) {
                return (string) $value;
            }
        }

        return '#'.$model->getKey();
    }

    private static function module(Model $model): string
    {
        return match (class_basename($model)) {
            'User' => 'Usuarios',
            'Unit', 'UnitDocument', 'UnitMovement' => 'Unidades',
            'UnitChecklist', 'UnitChecklistAnswer', 'UnitChecklistPhoto', 'UnitChecklistSignature', 'InspectionBatch', 'InspectionEditRequest' => 'Inspecciones',
            'Induction', 'InductionAttendee', 'InductionRegulation', 'InductionType' => 'Inducciones',
            'AlcoholTest', 'AlcoholTestPackage' => 'Alcohómetro',
            'DriverBlacklistEntry', 'Driver', 'DriverBiometric' => 'Conductores',
            'Certificate', 'CertificateTemplate' => 'Certificados',
            'Place', 'Site' => 'Lugares',
            'Period' => 'Periodos',
            'ChecklistTemplate', 'ChecklistItem' => 'Pareto',
            default => Str::headline(class_basename($model)),
        };
    }

    public static function browser(?string $agent): string
    {
        $agent ??= '';

        return match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/') || str_contains($agent, 'Opera') => 'Opera',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Firefox/') => 'Firefox',
            str_contains($agent, 'Safari/') => 'Safari',
            $agent === '' => '—',
            default => 'Otro',
        };
    }
}
