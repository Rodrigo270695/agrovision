<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $driver_id
 * @property int $period_id
 * @property int $unit_id
 * @property int $unit_movement_id
 * @property Carbon $service_date
 */
class DriverMovement extends Model
{
    protected $fillable = [
        'driver_id',
        'period_id',
        'unit_id',
        'unit_movement_id',
        'service_date',
        'correlative',
        'plate_number',
        'provider',
        'coordinator_id',
        'sede',
        'driver_name',
        'driver_dni',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
        ];
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function unitMovement(): BelongsTo
    {
        return $this->belongsTo(UnitMovement::class);
    }
}
