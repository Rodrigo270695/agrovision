<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectionEvidence extends Model
{
    use HasUuids;

    protected $table = 'inspection_evidences';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'inspection_id',
        'checklist_item_id',
        'file_path',
        'file_mime',
        'file_size_bytes',
        'checksum_sha256',
        'caption',
        'latitude',
        'longitude',
        'accuracy',
        'captured_at',
        'uploaded_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy' => 'float',
            'captured_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Inspection, $this>
     */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    /**
     * @return BelongsTo<ChecklistItem, $this>
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }
}
