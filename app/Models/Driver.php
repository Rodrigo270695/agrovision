<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'drivers';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'full_name',
        'document_type',
        'document_number',
        'license_number',
        'license_class',
        'license_revalidation_date',
        'phone',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'license_revalidation_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Inspection, $this>
     */
    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }
}
