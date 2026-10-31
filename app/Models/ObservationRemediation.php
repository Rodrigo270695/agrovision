<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $unit_checklist_id
 * @property string $inspection_pass
 * @property string $status
 * @property int|null $inspector_id
 * @property int|null $submitted_by
 * @property Carbon|null $submitted_at
 * @property string|null $submit_note
 * @property int|null $verified_by
 * @property Carbon|null $verified_at
 * @property string|null $rejection_note
 * @property-read UnitChecklist $checklist
 */
class ObservationRemediation extends Model
{
    public const OPEN = 'open';

    public const SUBMITTED = 'submitted';

    public const VERIFIED = 'verified';

    public const REJECTED = 'rejected';

    protected $fillable = [
        'unit_checklist_id',
        'inspection_pass',
        'status',
        'inspector_id',
        'submitted_by',
        'submitted_at',
        'submit_note',
        'verified_by',
        'verified_at',
        'rejection_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(UnitChecklist::class, 'unit_checklist_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ObservationRemediationPhoto::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ObservationRemediationEvent::class)->orderByDesc('id');
    }

    public function isPendingInspector(): bool
    {
        return $this->status === self::SUBMITTED;
    }

    public function canSubmit(): bool
    {
        return in_array($this->status, [self::OPEN, self::REJECTED], true);
    }
}
