<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistTemplateVersion extends Model
{
    use HasUuids;

    protected $table = 'checklist_template_versions';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'checklist_template_id',
        'version_number',
        'effective_from',
        'effective_to',
        'document_title',
        'is_published',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_published' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<ChecklistTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class, 'checklist_template_id');
    }

    /**
     * @return HasMany<ChecklistItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ChecklistItem::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<ChecklistSignatureSlot, $this>
     */
    public function signatureSlots(): HasMany
    {
        return $this->hasMany(ChecklistSignatureSlot::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<Inspection, $this>
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }
}
