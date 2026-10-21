<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class RcInsuranceStatusEvent extends Model
{
    protected $fillable = [
        'rc_insurance_id',
        'status',
        'happened_on',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'happened_on' => 'date',
        ];
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(RcInsurance::class, 'rc_insurance_id');
    }
}
