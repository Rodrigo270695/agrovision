<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InspectionAttempt extends Model
{
    use HasUuids;

    protected $table = 'inspection_attempts';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'inspection_id',
        'attempt_number',
        'inspected_at',
        'result',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempt_number' => 'integer',
            'inspected_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Inspection, $this>
     */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    /**
     * @return HasMany<InspectionAnswer, $this>
     */
    public function answers(): HasMany
    {
        return $this->hasMany(InspectionAnswer::class);
    }
}
