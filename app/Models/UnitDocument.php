<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $unit_id
 * @property string $type
 * @property string|null $title
 * @property string $original_name
 * @property string $path
 * @property string $disk
 * @property string|null $mime_type
 * @property int|null $size
 * @property Carbon|null $expires_at
 * @property int|null $uploaded_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Unit $unit
 * @property-read User|null $uploader
 */
class UnitDocument extends Model
{
    protected $fillable = [
        'unit_id',
        'type',
        'title',
        'original_name',
        'path',
        'disk',
        'mime_type',
        'size',
        'expires_at',
        'uploaded_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'date',
            'size' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (UnitDocument $document): void {
            if ($document->path !== '') {
                Storage::disk($document->disk)->delete($document->path);
            }
        });
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isPdf(): bool
    {
        return str_contains(mb_strtolower((string) $this->mime_type), 'pdf')
            || str_ends_with(mb_strtolower($this->original_name), '.pdf');
    }

    public function isImage(): bool
    {
        return str_starts_with(mb_strtolower((string) $this->mime_type), 'image/');
    }

    public function url(): string
    {
        return '/storage/'.ltrim($this->path, '/');
    }
}
