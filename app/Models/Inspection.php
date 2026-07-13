<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Inspection extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'inspections';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'checklist_template_version_id',
        'vehicle_id',
        'driver_id',
        'transport_company_id',
        'location',
        'additional_observations',
        'vehicle_plate_snapshot',
        'vehicle_brand_model_year_snapshot',
        'driver_name_snapshot',
        'driver_license_snapshot',
        'driver_license_class_snapshot',
        'driver_license_revalidation_snapshot',
        'company_name_snapshot',
        'status',
        'is_locked',
        'integrity_hash',
        'closed_at',
        'closed_by',
        'inspected_by',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'driver_license_revalidation_snapshot' => 'date',
            'is_locked' => 'boolean',
            'closed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ChecklistTemplateVersion, $this>
     */
    public function templateVersion(): BelongsTo
    {
        return $this->belongsTo(ChecklistTemplateVersion::class, 'checklist_template_version_id');
    }

    /**
     * @return BelongsTo<Vehicle, $this>
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * @return BelongsTo<Driver, $this>
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    /**
     * @return BelongsTo<TransportCompany, $this>
     */
    public function transportCompany(): BelongsTo
    {
        return $this->belongsTo(TransportCompany::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    /**
     * @return HasMany<InspectionAttempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(InspectionAttempt::class)->orderBy('attempt_number');
    }

    /**
     * @return HasMany<InspectionSignature, $this>
     */
    public function signatures(): HasMany
    {
        return $this->hasMany(InspectionSignature::class);
    }

    /**
     * @return HasMany<InspectionEvidence, $this>
     */
    public function evidences(): HasMany
    {
        return $this->hasMany(InspectionEvidence::class);
    }
}
