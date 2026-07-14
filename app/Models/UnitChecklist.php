<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

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
 * @property \Illuminate\Support\Carbon|null $sealed_at
 * @property-read Unit $unit
 * @property-read Period $period
 * @property-read ChecklistTemplate $template
 */
class UnitChecklist extends Model
{
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
}
