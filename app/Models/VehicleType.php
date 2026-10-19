<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property int $sort
 * @property int|null $checklist_template_id
 */
class VehicleType extends Model
{
    protected $fillable = [
        'name',
        'sort',
        'checklist_template_id',
    ];

    public function checklistTemplate(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class, 'checklist_template_id');
    }
}
