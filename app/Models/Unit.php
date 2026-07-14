<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 * @property int|null $coordinator_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Period $period
 * @property-read User|null $coordinatorUser
 * @property-read \Illuminate\Database\Eloquent\Collection<int, UnitDocument> $documents
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

    protected static function booted(): void
    {
        static::deleting(function (Unit $unit): void {
            $unit->documents()->each(function (UnitDocument $document): void {
                $document->delete();
            });
        });
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function coordinatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(UnitDocument::class);
    }
}
