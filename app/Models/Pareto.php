<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $template_type
 * @property int|null $parent_id
 * @property string $item_number
 * @property string $label
 * @property int $sort_order
 * @property string $check_type
 * @property string $weight
 * @property bool $is_active
 */
class Pareto extends Model
{
    protected $table = 'pareto';

    protected $fillable = [
        'template_type',
        'parent_id',
        'item_number',
        'label',
        'sort_order',
        'check_type',
        'weight',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'weight' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }
}
