<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserLocationPing extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'user_name',
        'latitude',
        'longitude',
        'accuracy',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }
}
