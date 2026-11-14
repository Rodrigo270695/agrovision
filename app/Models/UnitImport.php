<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $period_id
 * @property int|null $user_id
 * @property Carbon $imported_on
 * @property string $scope_key
 */
class UnitImport extends Model
{
    protected $fillable = [
        'period_id',
        'user_id',
        'imported_on',
        'scope_key',
        'original_name',
        'file_path',
        'file_disk',
    ];

    protected function casts(): array
    {
        return [
            'imported_on' => 'date',
        ];
    }

    public function rollbacks(): HasMany
    {
        return $this->hasMany(UnitImportRollback::class, 'import_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(UnitMovement::class, 'import_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
