<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicle extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'vehicles';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'plate',
        'brand',
        'model',
        'year',
        'unit_type',
        'ownership_type',
        'seat_capacity',
        'transport_company_id',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'seat_capacity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<TransportCompany, $this>
     */
    public function transportCompany(): BelongsTo
    {
        return $this->belongsTo(TransportCompany::class);
    }

    /**
     * @return HasMany<Inspection, $this>
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }
}
