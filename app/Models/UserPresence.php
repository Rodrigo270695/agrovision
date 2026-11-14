<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPresence extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'latitude',
        'longitude',
        'accuracy',
        'ip',
        'browser',
        'user_agent',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy' => 'integer',
            'last_seen_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
