<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectionAnswer extends Model
{
    use HasUuids;

    protected $table = 'inspection_answers';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'inspection_attempt_id',
        'checklist_item_id',
        'complies',
        'observation',
        'expiry_date',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<InspectionAttempt, $this>
     */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(InspectionAttempt::class, 'inspection_attempt_id');
    }

    /**
     * @return BelongsTo<ChecklistItem, $this>
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }
}
