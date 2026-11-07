<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Historial de traspasos de una inspección entre inspectores.
 *
 * @property int $id
 * @property int $unit_checklist_id
 * @property int|null $from_user_id
 * @property int $to_user_id
 * @property int|null $transferred_by
 * @property string|null $note
 * @property array<string, mixed>|null $payload
 */
class UnitChecklistTransfer extends Model
{
    protected $fillable = [
        'unit_checklist_id',
        'from_user_id',
        'to_user_id',
        'transferred_by',
        'note',
        'payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(UnitChecklist::class, 'unit_checklist_id');
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    public function transferredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_by');
    }
}
