<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string|null $identity_key
 * @property string|null $driver_dni
 * @property string $driver_name
 * @property string|null $plate_number
 * @property string $reason_code
 * @property string|null $reason_detail
 * @property string $photo_path
 * @property string $source
 * @property int|null $unit_id
 * @property int|null $unit_checklist_id
 * @property int|null $alcohol_test_id
 * @property int|null $induction_attendee_id
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $lifted_at
 * @property int|null $lifted_by
 * @property string|null $lift_note
 */
class DriverBlacklistEntry extends Model
{
    public const REASON_ETHANOL = 'estado_etilico';

    public const REASON_IDENTITY = 'suplantacion_identidad';

    public const REASON_OTHER = 'otro';

    public const SOURCE_CHECKLIST = 'checklist';

    public const SOURCE_ALCOHOL = 'alcohol_test';

    public const SOURCE_INDUCTION = 'induction';

    public const SOURCE_MANUAL = 'manual';

    protected $fillable = [
        'identity_key',
        'driver_dni',
        'driver_name',
        'plate_number',
        'reason_code',
        'reason_detail',
        'photo_path',
        'source',
        'unit_id',
        'unit_checklist_id',
        'alcohol_test_id',
        'induction_attendee_id',
        'created_by',
        'lifted_at',
        'lifted_by',
        'lift_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lifted_at' => 'datetime',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function reasonLabels(): array
    {
        return [
            self::REASON_ETHANOL => 'Ingreso con estado etílico',
            self::REASON_IDENTITY => 'Suplantación de identidad',
            self::REASON_OTHER => 'Otro motivo',
        ];
    }

    public function isActive(): bool
    {
        return $this->lifted_at === null;
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lifter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lifted_by');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
