<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $coordinator_id
 * @property Carbon $inspected_on
 * @property string $status
 * @property int|null $sent_by
 * @property Carbon|null $sent_at
 * @property string|null $signer_name
 * @property string|null $signature_path
 * @property Carbon|null $signed_at
 * @property-read User $coordinator
 * @property-read User|null $sender
 */
class InspectionBatch extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_SENT = 'sent';

    public const STATUS_SIGNED = 'signed';

    protected $fillable = [
        'coordinator_id',
        'inspected_on',
        'status',
        'sent_by',
        'sent_at',
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
            'inspected_on' => 'date',
            'sent_at' => 'datetime',
            'signed_at' => 'datetime',
        ];
    }

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function checklists(): HasMany
    {
        return $this->hasMany(UnitChecklist::class);
    }

    public function isSigned(): bool
    {
        return $this->status === self::STATUS_SIGNED;
    }

    public function signatureUrl(): ?string
    {
        if (! $this->signature_path) {
            return null;
        }

        return Storage::disk('public')->url($this->signature_path);
    }
}
