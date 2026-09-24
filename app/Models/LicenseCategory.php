<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property int $sort
 */
class LicenseCategory extends Model
{
    protected $fillable = [
        'name',
        'description',
        'sort',
    ];
}
