<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $induction_id
 * @property int|null $unit_id
 * @property string $driver_name
 * @property string|null $area_cargo
 * @property string|null $driver_dni
 * @property string|null $plate_number
 * @property string|null $phone
 * @property string|null $provider
 * @property string|null $correlative
 * @property string $status
 * @property Carbon|null $attended_at
 * @property string|null $notes
 * @property string|null $signature_path
 * @property Carbon|null $signed_at
 * @property string|null $fingerprint_path
 * @property Carbon|null $fingerprint_at
 */
class InductionAttendee extends Model
{
    protected $fillable = [
        'induction_id',
        'unit_id',
        'driver_name',
        'area_cargo',
        'driver_dni',
        'plate_number',
        'phone',
        'provider',
        'correlative',
        'status',
        'attended_at',
        'notes',
        'signature_path',
        'signed_at',
        'fingerprint_path',
        'fingerprint_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attended_at' => 'datetime',
            'signed_at' => 'datetime',
            'fingerprint_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (InductionAttendee $attendee): void {
            $disk = \Illuminate\Support\Facades\Storage::disk('public');

            if ($attendee->signature_path) {
                $disk->delete($attendee->signature_path);
            }

            if ($attendee->fingerprint_path) {
                $disk->delete($attendee->fingerprint_path);
            }
        });
    }

    public function induction(): BelongsTo
    {
        return $this->belongsTo(Induction::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function signatureUrl(): ?string
    {
        if (! $this->signature_path) {
            return null;
        }

        return '/storage/'.ltrim($this->signature_path, '/');
    }

    public function fingerprintUrl(): ?string
    {
        if (! $this->fingerprint_path) {
            return null;
        }

        return '/storage/'.ltrim($this->fingerprint_path, '/');
    }

    public function isSigned(): bool
    {
        return filled($this->signature_path);
    }

    public function hasFingerprint(): bool
    {
        return filled($this->fingerprint_path);
    }
}
