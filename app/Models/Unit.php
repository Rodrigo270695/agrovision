<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $period_id
 * @property string $correlative
 * @property string|null $phone
 * @property string|null $email
 * @property string $provider
 * @property string|null $route
 * @property string|null $vehicle_type
 * @property Carbon|null $service_date
 * @property string|null $driver_name
 * @property string|null $plate_number
 * @property string|null $responsible_person
 * @property string|null $service_type
 * @property string|null $ruc
 * @property string|null $driver_dni
 * @property string|null $category
 * @property string|null $coordinator
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Period $period
 */
class Unit extends Model
{
    /** @use HasFactory<\Database\Factories\UnitFactory> */
    use HasFactory;

    protected $fillable = [
        'period_id',
        'correlative',
        'phone',
        'email',
        'provider',
        'route',
        'vehicle_type',
        'service_date',
        'driver_name',
        'plate_number',
        'responsible_person',
        'service_type',
        'ruc',
        'driver_dni',
        'category',
        'coordinator',
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

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }
}
