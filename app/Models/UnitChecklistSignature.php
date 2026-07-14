<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $unit_checklist_id
 * @property int $signature_role_id
 * @property string|null $signer_name
 * @property string|null $signature_path
 * @property Carbon|null $signed_at
 */
class UnitChecklistSignature extends Model
{
    protected $fillable = [
        'unit_checklist_id',
        'signature_role_id',
        'signer_name',
        'signature_path',
        'signed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(UnitChecklist::class, 'unit_checklist_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(ChecklistSignatureRole::class, 'signature_role_id');
    }

    public function signatureUrl(): ?string
    {
        if (! $this->signature_path) {
            return null;
        }

        return '/storage/'.ltrim($this->signature_path, '/');
    }

    public function deleteSignatureFile(): void
    {
        if ($this->signature_path) {
            Storage::disk('public')->delete($this->signature_path);
        }
    }
}
