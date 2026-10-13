<?php

namespace App\Models;

use App\Support\PublicDisk;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $dni
 * @property string|null $name_key
 * @property string|null $driver_name
 * @property string|null $signature_path
 * @property string|null $fingerprint_path
 */
class DriverBiometric extends Model
{
    protected $fillable = [
        'dni',
        'name_key',
        'driver_name',
        'signature_path',
        'fingerprint_path',
    ];

    public function signatureUrl(): ?string
    {
        return $this->signature_path
            ? PublicDisk::url($this->signature_path)
            : null;
    }

    public function fingerprintUrl(): ?string
    {
        return $this->fingerprint_path
            ? PublicDisk::url($this->fingerprint_path)
            : null;
    }
}
