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
 * @property string $status
 * @property Carbon|null $sent_to_coordinators_at
 * @property Carbon|null $closed_at
 * @property int|null $closed_by
 * @property int|null $period_id
 * @property int|null $created_by
 */
class AlcoholTestPackage extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'title',
        'session_date',
        'notes',
        'status',
        'sent_to_coordinators_at',
        'closed_at',
        'closed_by',
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
            'sent_to_coordinators_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isOpen(): bool
    {
        return $this->status !== self::STATUS_CLOSED;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    public function wasSentToCoordinators(): bool
    {
        return $this->sent_to_coordinators_at !== null;
    }

    public function canModify(): bool
    {
        return $this->isOpen();
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

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
