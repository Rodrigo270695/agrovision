<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class CentralCertificate extends Model
{
    protected $fillable = [
        'template_id',
        'participant_id',
        'code',
        'token',
        'participant_name',
        'participant_dni',
        'course_title',
        'issued_on',
        'expires_on',
        'variables',
    ];

    protected function casts(): array
    {
        return [
            'issued_on' => 'date',
            'expires_on' => 'date',
            'variables' => 'array',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CentralCertificateTemplate::class, 'template_id');
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(CentralParticipant::class, 'participant_id');
    }

    public function isValid(?Carbon $on = null): bool
    {
        if ($this->expires_on === null) {
            return true;
        }

        return $this->expires_on->startOfDay()->greaterThanOrEqualTo(($on ?? now())->startOfDay());
    }
}
