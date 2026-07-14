<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $template_id
 * @property string $label
 * @property int $sort_order
 */
class ChecklistSignatureRole extends Model
{
    protected $fillable = [
        'template_id',
        'label',
        'sort_order',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class, 'template_id');
    }
}
