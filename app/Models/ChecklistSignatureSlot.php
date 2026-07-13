<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistSignatureSlot extends Model
{
    use HasUuids;

    protected $table = 'checklist_signature_slots';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'checklist_template_version_id',
        'role',
        'label',
        'sort_order',
        'is_required',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_required' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<ChecklistTemplateVersion, $this>
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplateVersion::class, 'checklist_template_version_id');
    }
}
