<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class RcInsuranceMovement extends Model
{
    protected $fillable = [
        'rc_insurance_id',
        'period_id',
        'service_date',
        'plate_number',
        'unit_class',
        'vehicle_type',
        'usage',
        'condition_flag',
        'supervisor_tdp',
        'procedure',
        'activated_on',
        'expires_on',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'activated_on' => 'date',
            'expires_on' => 'date',
        ];
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(RcInsurance::class, 'rc_insurance_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }
}
