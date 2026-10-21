<?php

namespace App\Models;

use App\Support\ParetoCheckTypes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

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
 * @property bool $allows_photo
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
        'allows_photo',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'has_expiry' => 'boolean',
            'weight' => 'decimal:2',
            'allows_photo' => 'boolean',
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

    /**
     * Ítems cuyo ítem Pareto sigue activo en el catálogo (plantillas vigentes).
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActivePareto(Builder $query): Builder
    {
        return $query->whereHas('pareto', fn (Builder $pareto) => $pareto->where('is_active', true));
    }

    /**
     * Padres del checklist alineados al catálogo Pareto activo.
     *
     * @return Collection<int, self>
     */
    public static function activeParentsForTemplateId(?int $templateId): Collection
    {
        if ($templateId === null) {
            return collect();
        }

        return self::query()
            ->where('template_id', $templateId)
            ->whereNull('parent_id')
            ->activePareto()
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * @param  Collection<int, UnitChecklistAnswer>  $answers
     * @return Collection<int, UnitChecklistAnswer>
     */
    public static function sortAnswers(Collection $answers): Collection
    {
        $withItem = $answers->filter(fn ($answer) => $answer->item !== null);
        $sorted = self::sortForDisplay(
            $withItem->map(fn ($answer) => $answer->item)->values(),
        );
        $position = [];

        foreach ($sorted as $index => $item) {
            $position[$item->id] = $index;
        }

        return $withItem
            ->sortBy(fn ($answer) => $position[$answer->item->id] ?? PHP_INT_MAX)
            ->values();
    }

    /**
     * @param  Collection<int, self>  $items
     * @return Collection<int, self>
     */
    public static function sortForDisplay(Collection $items): Collection
    {
        $numbers = [];

        foreach ($items as $item) {
            $numbers[$item->id] = self::numberParts((string) $item->item_number);
        }

        return $items
            ->sortBy(fn (self $item) => self::displayOrderKey($item, $numbers))
            ->values();
    }

    /**
     * @param  array<int, array{0: int, 1: int, 2: string}>  $numbers
     * @return array{0: int, 1: int, 2: string, 3: int, 4: int, 5: int, 6: string, 7: int}
     */
    public static function displayOrderKey(self $item, array $numbers): array
    {
        $own = $numbers[$item->id] ?? self::numberParts((string) $item->item_number);
        $family = $item->parent_id !== null
            ? ($numbers[$item->parent_id] ?? $own)
            : $own;

        return [
            $family[0],
            $family[1],
            $family[2],
            $item->parent_id === null ? 0 : 1,
            $own[0],
            $own[1],
            $own[2],
            $item->id,
        ];
    }

    /**
     * @return array{0: int, 1: int, 2: string}
     */
    public static function numberParts(string $number): array
    {
        $number = trim($number);

        if (preg_match('/^\d+$/', $number) === 1) {
            return [0, (int) $number, ''];
        }

        return [1, 0, mb_strtolower($number)];
    }

    public function resolvedCheckType(): string
    {
        if ($this->check_type) {
            return $this->check_type;
        }

        return $this->has_expiry
            ? ParetoCheckTypes::EXPIRY
            : ParetoCheckTypes::OBSERVATION;
    }
}
