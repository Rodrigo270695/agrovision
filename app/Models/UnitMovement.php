<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $unit_id
 * @property int $period_id
 * @property string $correlative
 * @property Carbon $service_date
 * @property string $plate_number
 * @property string|null $phone
 * @property string|null $provider
 * @property string|null $route
 * @property string|null $vehicle_type
 * @property string|null $driver_name
 * @property string|null $responsible_person
 * @property string|null $service_type
 * @property string|null $ruc
 * @property string|null $driver_dni
 * @property string|null $category
 * @property int|null $coordinator_id
 */
class UnitMovement extends Model
{
    protected $fillable = [
        'unit_id',
        'period_id',
        'correlative',
        'service_date',
        'plate_number',
        'phone',
        'provider',
        'route',
        'vehicle_type',
        'driver_name',
        'responsible_person',
        'service_type',
        'ruc',
        'driver_dni',
        'category',
        'coordinator_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'service_date' => 'date',
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

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }
}
