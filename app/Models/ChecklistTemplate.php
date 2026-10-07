<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $type
 * @property string $code
 * @property string $name
 * @property string|null $label
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
        'label',
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

    public function displayLabel(): string
    {
        $label = trim((string) $this->label);

        return $label !== '' ? $label : mb_strtoupper((string) $this->type);
    }

    /**
     * @return list<array{id: int, value: string, label: string, deletable: bool}>
     */
    public static function options(): array
    {
        return static::query()
            ->where('is_active', true)
            ->select(['id', 'type', 'label'])
            ->withCount('unitChecklists')
            ->orderBy('id')
            ->get()
            ->map(fn (self $template) => [
                'id' => $template->id,
                'value' => $template->type,
                'label' => $template->displayLabel(),
                'deletable' => (int) $template->unit_checklists_count === 0,
            ])
            ->all();
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
