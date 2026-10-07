<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CentralParticipant extends Model
{
    protected $fillable = [
        'training_id',
        'dni',
        'full_name',
        'names',
        'paternal_surname',
        'maternal_surname',
    ];

    public function training(): BelongsTo
    {
        return $this->belongsTo(CentralTraining::class, 'training_id');
    }
}
