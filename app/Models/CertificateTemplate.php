<?php

namespace App\Models;

use App\Support\CertificateVariables;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class CertificateTemplate extends Model
{
    protected $fillable = [
        'induction_id',
        'name',
        'issuer_name',
        'issuer_title',
        'validity_months',
        'background_path',
        'signature_path',
        'logo_path',
        'layout',
        'custom_variables',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'layout' => 'array',
            'custom_variables' => 'array',
            'validity_months' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (CertificateTemplate $template): void {
            $disk = Storage::disk('public');

            if ($template->background_path) {
                $disk->delete($template->background_path);
            }

            if ($template->signature_path) {
                $disk->delete($template->signature_path);
            }

            if ($template->logo_path) {
                $disk->delete($template->logo_path);
            }
        });
    }

    public function induction(): BelongsTo
    {
        return $this->belongsTo(Induction::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    /**
     * @return array{blocks: list<array<string, mixed>>, qr: array{x: float, y: float, size: float}, signature: array{x: float, y: float, w: float, h: float}, logo: array{x: float, y: float, w: float, h: float}}
     */
    public function resolvedLayout(): array
    {
        $layout = is_array($this->layout) ? $this->layout : [];
        $defaults = CertificateVariables::defaultLayout();

        return [
            'blocks' => is_array($layout['blocks'] ?? null) ? $layout['blocks'] : $defaults['blocks'],
            'qr' => array_merge($defaults['qr'], is_array($layout['qr'] ?? null) ? $layout['qr'] : []),
            'signature' => array_merge($defaults['signature'], is_array($layout['signature'] ?? null) ? $layout['signature'] : []),
            'logo' => array_merge($defaults['logo'], is_array($layout['logo'] ?? null) ? $layout['logo'] : []),
        ];
    }

    public function backgroundUrl(): ?string
    {
        return $this->background_path
            ? Storage::disk('public')->url($this->background_path)
            : null;
    }

    public function signatureUrl(): ?string
    {
        return $this->signature_path
            ? Storage::disk('public')->url($this->signature_path)
            : null;
    }

    public function logoUrl(): ?string
    {
        return $this->logo_path
            ? Storage::disk('public')->url($this->logo_path)
            : null;
    }
}
