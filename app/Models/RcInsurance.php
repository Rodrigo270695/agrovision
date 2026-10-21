<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $period_id
 * @property string $plate_number
 * @property string|null $unit_class
 * @property string|null $vehicle_type
 * @property string|null $usage
 * @property string|null $condition_flag
 * @property string|null $supervisor_tdp
 * @property string|null $procedure
 * @property Carbon|null $activated_on
 * @property Carbon|null $expires_on
 * @property Carbon|null $service_date
 * @property string $status
 */
class RcInsurance extends Model
{
    protected $fillable = [
        'period_id',
        'plate_number',
        'unit_class',
        'vehicle_type',
        'usage',
        'condition_flag',
        'supervisor_tdp',
        'procedure',
        'activated_on',
        'expires_on',
        'service_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'activated_on' => 'date',
            'expires_on' => 'date',
            'service_date' => 'date',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(RcInsuranceMovement::class);
    }
}
