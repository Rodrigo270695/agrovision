<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $observation_remediation_id
 * @property string $path
 * @property string $disk
 * @property string|null $mime_type
 * @property int|null $size
 * @property int|null $uploaded_by
 */
class ObservationRemediationPhoto extends Model
{
    protected $fillable = [
        'observation_remediation_id',
        'path',
        'disk',
        'mime_type',
        'size',
        'uploaded_by',
    ];

    public function remediation(): BelongsTo
    {
        return $this->belongsTo(ObservationRemediation::class, 'observation_remediation_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function url(): ?string
    {
        if ($this->path === '' || $this->path === null) {
            return null;
        }

        return Storage::disk($this->disk ?: 'public')->url($this->path);
    }
}
