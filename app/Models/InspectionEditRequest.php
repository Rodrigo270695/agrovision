<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $unit_checklist_id
 * @property string $inspection_pass
 * @property int $requested_by
 * @property string $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $consumed_at
 * @property-read UnitChecklist $checklist
 * @property-read User $requester
 */
class InspectionEditRequest extends Model
{
    public const PENDING = 'pending';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    protected $fillable = [
        'unit_checklist_id',
        'inspection_pass',
        'requested_by',
        'status',
        'reviewed_by',
        'reviewed_at',
        'consumed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(UnitChecklist::class, 'unit_checklist_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public static function openGrant(int $checklistId, string $pass, int $userId): ?self
    {
        return self::query()
            ->where('unit_checklist_id', $checklistId)
            ->where('inspection_pass', $pass)
            ->where('requested_by', $userId)
            ->where('status', self::APPROVED)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();
    }
}
