<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Place extends Model
{
    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function alcoholTests(): HasMany
    {
        return $this->hasMany(AlcoholTest::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
