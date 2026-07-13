<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TransportCompany extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'transport_companies';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'legal_name',
        'trade_name',
        'ruc',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Vehicle, $this>
     */
    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    /**
     * @return HasMany<Inspection, $this>
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }
}
