<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CentralTraining extends Model
{
    protected $fillable = [
        'name',
        'created_by',
    ];

    public function participants(): HasMany
    {
        return $this->hasMany(CentralParticipant::class, 'training_id');
    }

    public function templates(): HasMany
    {
        return $this->hasMany(CentralCertificateTemplate::class, 'training_id');
    }
}
