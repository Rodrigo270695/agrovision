<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $daily_quota
 */
class InspectorQuota extends Model
{
    protected $fillable = [
        'user_id',
        'daily_quota',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
