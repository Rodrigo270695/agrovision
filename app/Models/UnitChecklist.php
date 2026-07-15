<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $unit_id
 * @property int $period_id
 * @property int $template_id
 * @property int|null $created_by
 * @property string $plate_number
 * @property string|null $driver_name
 * @property string|null $provider
 * @property Carbon|null $first_inspected_on
 * @property string|null $first_inspected_time
 * @property Carbon|null $second_inspected_on
 * @property string|null $second_inspected_time
 * @property string|null $location
 * @property string|null $transport_company
 * @property string|null $vehicle_info
 * @property string|null $license_number
 * @property string|null $license_class
 * @property Carbon|null $license_revalidation_on
 * @property string|null $first_result
 * @property string|null $second_result
 * @property string|null $additional_observations
 * @property string|null $status
 * @property string|null $coordinator_status
 * @property Carbon|null $sent_to_coordinator_at
 * @property string|null $coordinator_action_plan
 * @property string|null $coordinator_signature_path
 * @property string|null $coordinator_signer_name
 * @property Carbon|null $coordinator_signed_at
 * @property Carbon|null $coordinator_responded_at
 * @property \Illuminate\Support\Carbon|null $sealed_at
 * @property-read Unit $unit
 * @property-read Period $period
 * @property-read ChecklistTemplate $template
 */
class UnitChecklist extends Model
{
    public const COORDINATOR_OBSERVED = 'observed';

    public const COORDINATOR_REVIEWED = 'reviewed';

    protected $fillable = [
        'unit_id',
        'period_id',
        'template_id',
        'created_by',
        'plate_number',
        'driver_name',
        'provider',
        'first_inspected_on',
        'first_inspected_time',
        'second_inspected_on',
        'second_inspected_time',
        'location',
        'transport_company',
        'vehicle_info',
        'license_number',
        'license_class',
        'license_revalidation_on',
        'first_result',
        'second_result',
        'additional_observations',
        'status',
        'coordinator_status',
        'sent_to_coordinator_at',
        'coordinator_action_plan',
        'coordinator_signature_path',
        'coordinator_signer_name',
        'coordinator_signed_at',
        'coordinator_responded_at',
        'sealed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'first_inspected_on' => 'date',
            'second_inspected_on' => 'date',
            'license_revalidation_on' => 'date',
            'sealed_at' => 'datetime',
            'sent_to_coordinator_at' => 'datetime',
            'coordinator_signed_at' => 'datetime',
            'coordinator_responded_at' => 'datetime',
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

    public function template(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class, 'template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(UnitChecklistAnswer::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(UnitChecklistSignature::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(UnitChecklistPhoto::class)->orderByDesc('created_at');
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isSealed(): bool
    {
        return $this->sealed_at !== null;
    }

    public function isObserved(): bool
    {
        return $this->coordinator_status === self::COORDINATOR_OBSERVED;
    }

    public function isReviewedByCoordinator(): bool
    {
        return $this->coordinator_status === self::COORDINATOR_REVIEWED;
    }

    public function hasFirstInspectionDecision(): bool
    {
        return in_array($this->first_result, ['approved', 'rejected'], true);
    }

    public function canSendToCoordinator(): bool
    {
        return $this->hasFirstInspectionDecision()
            && ! $this->isSealed()
            && $this->coordinator_status !== self::COORDINATOR_REVIEWED;
    }

    public function canPreviewConsolidatedPdf(): bool
    {
        return $this->hasFirstInspectionDecision() || $this->isSealed();
    }

    public function canStartSecondInspection(): bool
    {
        return $this->first_result === 'approved'
            && $this->isReviewedByCoordinator()
            && ! $this->isSealed();
    }

    public function coordinatorSignatureUrl(): ?string
    {
        if (! $this->coordinator_signature_path) {
            return null;
        }

        return Storage::disk('public')->url($this->coordinator_signature_path);
    }

    public function deleteCoordinatorSignatureFile(): void
    {
        if ($this->coordinator_signature_path) {
            Storage::disk('public')->delete($this->coordinator_signature_path);
        }
    }
}
