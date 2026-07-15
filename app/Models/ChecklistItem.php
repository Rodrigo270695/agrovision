<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $template_id
 * @property int|null $pareto_id
 * @property int|null $parent_id
 * @property string|null $item_number
 * @property string $label
 * @property int $sort_order
 * @property bool $has_expiry
 * @property string|null $check_type
 * @property string|null $weight
 */
class ChecklistItem extends Model
{
    protected $fillable = [
        'template_id',
        'pareto_id',
        'parent_id',
        'item_number',
        'label',
        'sort_order',
        'has_expiry',
        'check_type',
        'weight',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'has_expiry' => 'boolean',
            'weight' => 'decimal:2',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplate::class, 'template_id');
    }

    public function pareto(): BelongsTo
    {
        return $this->belongsTo(Pareto::class, 'pareto_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function resolvedCheckType(): string
    {
        if ($this->check_type) {
            return $this->check_type;
        }

        return $this->has_expiry
            ? \App\Support\ParetoCheckTypes::EXPIRY
            : \App\Support\ParetoCheckTypes::OBSERVATION;
    }
}
