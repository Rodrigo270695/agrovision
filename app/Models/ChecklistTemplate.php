<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistTemplate extends Model
{
    use HasUuids;

    protected $table = 'checklist_templates';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'short_code',
        'name',
        'unit_type',
        'description',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<ChecklistTemplateVersion, $this>
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ChecklistTemplateVersion::class);
    }

    public function publishedVersion(): ?ChecklistTemplateVersion
    {
        return $this->versions()
            ->where('is_published', true)
            ->orderByDesc('version_number')
            ->first();
    }
}
