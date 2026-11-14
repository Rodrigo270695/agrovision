<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'user_name',
        'action',
        'module',
        'record_type',
        'record_id',
        'record_code',
        'changes',
        'ip',
        'browser',
        'user_agent',
        'url',
        'is_alert',
        'alert_reason',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'is_alert' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
