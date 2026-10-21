<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class GpsMovement extends Model
{
    protected $fillable = [
        'gps_record_id',
        'period_id',
        'service_date',
        'plate_number',
        'imei',
        'installed_on',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'installed_on' => 'date',
        ];
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(GpsRecord::class, 'gps_record_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }
}
