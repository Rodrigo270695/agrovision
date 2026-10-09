<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $unit_id
 * @property string $status
 * @property Carbon $happened_on
 * @property string $source
 */
class UnitStatusEvent extends Model
{
    protected $fillable = [
        'unit_id',
        'status',
        'happened_on',
        'source',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'happened_on' => 'date',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
