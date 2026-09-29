<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certificate extends Model
{
    protected $fillable = [
        'certificate_template_id',
        'induction_id',
        'induction_attendee_id',
        'code',
        'token',
        'participant_name',
        'participant_dni',
        'course_title',
        'session_on',
        'hours',
        'issued_on',
        'expires_on',
        'issuer_name',
        'issuer_title',
        'variables',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'session_on' => 'date',
            'issued_on' => 'date',
            'expires_on' => 'date',
            'variables' => 'array',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }

    public function induction(): BelongsTo
    {
        return $this->belongsTo(Induction::class);
    }

    public function attendee(): BelongsTo
    {
        return $this->belongsTo(InductionAttendee::class, 'induction_attendee_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_on !== null && $this->expires_on->endOfDay()->isPast();
    }
}
