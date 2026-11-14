<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $import_id
 * @property int|null $unit_id
 * @property bool $created_unit
 * @property string|null $previous_status
 * @property string|null $previous_provider
 * @property string|null $previous_driver_name
 * @property string|null $previous_driver_dni
 * @property int|null $previous_coordinator_id
 * @property string|null $previous_responsible_person
 * @property list<int>|null $status_event_ids
 */
class UnitImportRollback extends Model
{
    protected $fillable = [
        'import_id',
        'unit_id',
        'created_unit',
        'previous_status',
        'previous_provider',
        'previous_driver_name',
        'previous_driver_dni',
        'previous_coordinator_id',
        'previous_responsible_person',
        'status_event_ids',
    ];

    protected function casts(): array
    {
        return [
            'created_unit' => 'boolean',
            'status_event_ids' => 'array',
        ];
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(UnitImport::class, 'import_id');
    }
}
