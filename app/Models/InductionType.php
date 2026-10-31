<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $slug
 * @property string $title
 * @property string $activity
 * @property string|null $short
 * @property int $sort_order
 * @property bool $is_active
 */
class InductionType extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'activity',
        'short',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function inductions(): HasMany
    {
        return $this->hasMany(Induction::class, 'induction_type', 'slug');
    }

    public static function makeSlug(string $title): string
    {
        $base = Str::slug(Str::limit($title, 60, ''), '-');

        if ($base === '') {
            $base = 'tipo';
        }

        $slug = $base;
        $i = 2;

        while (static::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }

    public static function makeShort(string $title): string
    {
        $clean = trim(preg_replace('/^(inducción|induccion|capacitación|capacitacion)\s*:\s*/iu', '', $title) ?? $title);

        return Str::limit($clean !== '' ? $clean : $title, 40, '');
    }
}
