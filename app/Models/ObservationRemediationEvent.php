<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $observation_remediation_id
 * @property string $event
 * @property int|null $user_id
 * @property array<string, mixed>|null $payload
 */
class ObservationRemediationEvent extends Model
{
    protected $fillable = [
        'observation_remediation_id',
        'event',
        'user_id',
        'payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function remediation(): BelongsTo
    {
        return $this->belongsTo(ObservationRemediation::class, 'observation_remediation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
