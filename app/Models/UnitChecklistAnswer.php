<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $unit_checklist_id
 * @property int $checklist_item_id
 * @property string|null $first_value
 * @property string|null $second_value
 * @property string|null $observations
 */
class UnitChecklistAnswer extends Model
{
    protected $fillable = [
        'unit_checklist_id',
        'checklist_item_id',
        'first_value',
        'second_value',
        'observations',
    ];

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(UnitChecklist::class, 'unit_checklist_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }
}
