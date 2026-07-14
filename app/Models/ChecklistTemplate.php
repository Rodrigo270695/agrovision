<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $type
 * @property string $code
 * @property string $name
 * @property string $version
 * @property string|null $notes_hint
 * @property bool $is_active
 */
class ChecklistTemplate extends Model
{
    protected $fillable = [
        'type',
        'code',
        'name',
        'version',
        'notes_hint',
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

    public function items(): HasMany
    {
        return $this->hasMany(ChecklistItem::class, 'template_id')->orderBy('sort_order');
    }

    public function signatureRoles(): HasMany
    {
        return $this->hasMany(ChecklistSignatureRole::class, 'template_id')->orderBy('sort_order');
    }

    public function unitChecklists(): HasMany
    {
        return $this->hasMany(UnitChecklist::class, 'template_id');
    }
}
