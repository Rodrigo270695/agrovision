<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistItem extends Model
{
    use HasUuids;

    protected $table = 'checklist_items';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'checklist_template_version_id',
        'parent_item_id',
        'item_code',
        'item_number',
        'sort_order',
        'label',
        'is_group',
        'is_required',
        'requires_expiry',
        'help_text',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_group' => 'boolean',
            'is_required' => 'boolean',
            'requires_expiry' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<ChecklistTemplateVersion, $this>
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplateVersion::class, 'checklist_template_version_id');
    }

    /**
     * @return BelongsTo<ChecklistItem, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChecklistItem::class, 'parent_item_id');
    }

    /**
     * @return HasMany<ChecklistItem, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(ChecklistItem::class, 'parent_item_id')->orderBy('sort_order');
    }
}
