<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property int $sort
 */
class ServiceType extends Model
{
    protected $fillable = [
        'name',
        'sort',
    ];
}
