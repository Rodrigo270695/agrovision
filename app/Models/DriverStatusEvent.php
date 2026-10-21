<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $driver_id
 * @property string $status
 * @property Carbon $happened_on
 * @property string $source
 */
class DriverStatusEvent extends Model
{
    protected $fillable = [
        'driver_id',
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

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }
}
