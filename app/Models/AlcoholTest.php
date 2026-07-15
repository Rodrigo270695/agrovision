<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int|null $unit_id
 * @property int|null $period_id
 * @property int|null $created_by
 * @property int|null $coordinator_id
 * @property Carbon $tested_at
 * @property string $driver_name
 * @property string|null $driver_dni
 * @property string|null $plate_number
 * @property string $alcohol_level
 * @property bool $is_positive
 * @property string|null $location
 * @property string|null $notes
 * @property string|null $coordinator_status
 * @property Carbon|null $coordinator_notified_at
 * @property string|null $coordinator_action_plan
 * @property string|null $coordinator_signer_name
 * @property string|null $coordinator_signature_path
 * @property Carbon|null $coordinator_signed_at
 */
class AlcoholTest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACKNOWLEDGED = 'acknowledged';

    /** Tolerancia permitida: cero. */
    public const TOLERANCE = 0.0;

    protected $fillable = [
        'unit_id',
        'period_id',
        'created_by',
        'coordinator_id',
        'tested_at',
        'driver_name',
        'driver_dni',
        'plate_number',
        'alcohol_level',
        'is_positive',
        'location',
        'notes',
        'coordinator_status',
        'coordinator_notified_at',
        'coordinator_action_plan',
        'coordinator_signer_name',
        'coordinator_signature_path',
        'coordinator_signed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tested_at' => 'datetime',
            'alcohol_level' => 'decimal:3',
            'is_positive' => 'boolean',
            'coordinator_notified_at' => 'datetime',
            'coordinator_signed_at' => 'datetime',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function isPending(): bool
    {
        return $this->is_positive
            && $this->coordinator_status === self::STATUS_PENDING;
    }

    public function canCoordinatorRespond(): bool
    {
        return $this->isPending();
    }

    public function coordinatorSignatureUrl(): ?string
    {
        if (! $this->coordinator_signature_path) {
            return null;
        }

        return '/storage/'.ltrim($this->coordinator_signature_path, '/');
    }

    public static function isPositiveLevel(float|string $level): bool
    {
        return (float) $level > self::TOLERANCE;
    }

    protected static function booted(): void
    {
        static::deleting(function (AlcoholTest $test): void {
            // Los registros de alcohómetro no deben borrarse (cumplimiento).
            throw new \RuntimeException(
                'Los tests de alcohómetro no pueden eliminarse.',
            );
        });
    }

    public function deleteSignatureFile(): void
    {
        if ($this->coordinator_signature_path) {
            Storage::disk('public')->delete($this->coordinator_signature_path);
        }
    }
}
