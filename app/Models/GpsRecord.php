<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class GpsRecord extends Model
{
    protected $fillable = [
        'period_id',
        'plate_number',
        'imei',
        'installed_on',
        'service_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'installed_on' => 'date',
            'service_date' => 'date',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(GpsMovement::class);
    }
}
