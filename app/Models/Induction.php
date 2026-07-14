<?php

namespace App\Models;

use App\Support\InductionStatuses;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $acta_number
 * @property string $title
 * @property string|null $temario
 * @property string|null $activity
 * @property bool $corrective_action
 * @property string|null $modality
 * @property string|null $school
 * @property array<int, string>|null $categories
 * @property string|null $category_other
 * @property Carbon|null $session_date
 * @property string|null $start_time
 * @property string|null $end_time
 * @property int|null $estimated_minutes
 * @property string|null $sede
 * @property string|null $department
 * @property string|null $area
 * @property string|null $section
 * @property string|null $zone
 * @property string|null $target_group
 * @property string|null $crop
 * @property string|null $org_unit
 * @property string|null $speaker_name
 * @property string|null $speaker_institution
 * @property string|null $speaker_signature_path
 * @property Carbon|null $speaker_signed_at
 * @property Carbon $scheduled_at
 * @property string|null $location
 * @property string|null $notes
 * @property string $status
 * @property int|null $period_id
 * @property int|null $created_by
 * @property Carbon|null $closed_at
 */
class Induction extends Model
{
    protected $fillable = [
        'acta_number',
        'document_code',
        'document_revision',
        'document_date',
        'risst_code',
        'risst_revision',
        'risst_date',
        'risst_approval_date',
        'risst_version',
        'title',
        'temario',
        'activity',
        'corrective_action',
        'modality',
        'school',
        'categories',
        'category_other',
        'session_date',
        'start_time',
        'end_time',
        'estimated_minutes',
        'sede',
        'department',
        'area',
        'section',
        'zone',
        'target_group',
        'crop',
        'org_unit',
        'speaker_name',
        'speaker_institution',
        'speaker_signature_path',
        'speaker_signed_at',
        'scheduled_at',
        'location',
        'notes',
        'status',
        'period_id',
        'created_by',
        'closed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'closed_at' => 'datetime',
            'session_date' => 'date',
            'document_date' => 'date',
            'risst_date' => 'date',
            'risst_approval_date' => 'date',
            'speaker_signed_at' => 'datetime',
            'corrective_action' => 'boolean',
            'categories' => 'array',
            'estimated_minutes' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (Induction $induction): void {
            if ($induction->speaker_signature_path) {
                \Illuminate\Support\Facades\Storage::disk('public')
                    ->delete($induction->speaker_signature_path);
            }
        });
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(InductionAttendee::class);
    }

    public function isLocked(): bool
    {
        return InductionStatuses::isLocked($this->status);
    }

    public function allAttendeesSigned(): bool
    {
        if ($this->attendees()->count() === 0) {
            return false;
        }

        return ! $this->attendees()
            ->where(function ($query) {
                $query->whereNull('signature_path')
                    ->orWhere('signature_path', '');
            })
            ->exists();
    }

    public function speakerIsSigned(): bool
    {
        return filled($this->speaker_signature_path);
    }

    public function speakerSignatureUrl(): ?string
    {
        if (! $this->speaker_signature_path) {
            return null;
        }

        return '/storage/'.ltrim($this->speaker_signature_path, '/');
    }

    public function canFinalize(): bool
    {
        return $this->status === InductionStatuses::IN_PROGRESS
            && $this->attendees()->count() > 0
            && $this->allAttendeesSigned()
            && $this->speakerIsSigned()
            && ! $this->isLocked();
    }

    public function canStartNow(): bool
    {
        if ($this->status !== InductionStatuses::SCHEDULED) {
            return false;
        }

        if (! $this->scheduled_at) {
            return false;
        }

        return now()->greaterThanOrEqualTo($this->scheduled_at);
    }

    public function isInProgress(): bool
    {
        return $this->status === InductionStatuses::IN_PROGRESS;
    }

    public function allowsAttendanceActions(): bool
    {
        return $this->isInProgress();
    }
}
