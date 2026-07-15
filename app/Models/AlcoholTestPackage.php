<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property Carbon $session_date
 * @property string|null $notes
 * @property int|null $period_id
 * @property int|null $created_by
 */
class AlcoholTestPackage extends Model
{
    protected $fillable = [
        'title',
        'session_date',
        'notes',
        'period_id',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'session_date' => 'date',
        ];
    }

    public function tests(): HasMany
    {
        return $this->hasMany(AlcoholTest::class, 'package_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
