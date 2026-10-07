<?php

namespace App\Models;

use App\Support\CentralCertificateLayout;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class CentralCertificateTemplate extends Model
{
    protected $fillable = [
        'training_id',
        'name',
        'course_title',
        'expires_on',
        'code_prefix',
        'next_sequence',
        'issuer_name',
        'issuer_title',
        'background_path',
        'signature_path',
        'stamp_path',
        'watermark_path',
        'logos',
        'layout',
        'custom_variables',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'expires_on' => 'date',
            'logos' => 'array',
            'layout' => 'array',
            'custom_variables' => 'array',
        ];
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(CentralTraining::class, 'training_id');
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(CentralCertificate::class, 'template_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function resolvedLayout(): array
    {
        return CentralCertificateLayout::resolve(is_array($this->layout) ? $this->layout : null);
    }

    public function fileUrl(?string $path): ?string
    {
        if ($path === null || $path === '' || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        return Storage::disk('public')->url($path);
    }
}
