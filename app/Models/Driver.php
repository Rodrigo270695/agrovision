<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $period_id
 * @property string $identity_key
 * @property string|null $driver_dni
 * @property string $driver_name
 * @property int|null $coordinator_id
 * @property string|null $sede
 * @property string|null $provider
 * @property string|null $plate_number
 * @property int|null $unit_id
 * @property Carbon|null $service_date
 * @property string $status
 */
class Driver extends Model
{
    protected $fillable = [
        'period_id',
        'identity_key',
        'driver_dni',
        'driver_name',
        'coordinator_id',
        'sede',
        'provider',
        'plate_number',
        'unit_id',
        'service_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function coordinatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(DriverMovement::class);
    }
}
