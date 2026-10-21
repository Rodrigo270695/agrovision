<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class GpsStatusEvent extends Model
{
    protected $fillable = [
        'gps_record_id',
        'status',
        'happened_on',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'happened_on' => 'date',
        ];
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(GpsRecord::class, 'gps_record_id');
    }
}
