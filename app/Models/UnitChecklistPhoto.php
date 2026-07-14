<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $unit_checklist_id
 * @property string $inspection_pass
 * @property string $path
 * @property string $disk
 * @property string|null $mime_type
 * @property int|null $size
 * @property Carbon|null $captured_at
 * @property string|null $latitude
 * @property string|null $longitude
 * @property string|null $accuracy
 * @property int|null $uploaded_by
 */
class UnitChecklistPhoto extends Model
{
    protected $fillable = [
        'unit_checklist_id',
        'inspection_pass',
        'path',
        'disk',
        'mime_type',
        'size',
        'captured_at',
        'latitude',
        'longitude',
        'accuracy',
        'uploaded_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy' => 'float',
            'size' => 'integer',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(UnitChecklist::class, 'unit_checklist_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function url(): string
    {
        // Ruta relativa: evita dependencias de APP_URL/puerto/dominio (Herd, artisan serve, etc.)
        return '/storage/'.ltrim($this->path, '/');
    }
}
