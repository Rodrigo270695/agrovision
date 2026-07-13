<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectionSignature extends Model
{
    use HasUuids;

    protected $table = 'inspection_signatures';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'inspection_id',
        'role',
        'signer_name',
        'signer_user_id',
        'signed_at',
        'signature_path',
        'ip_address',
        'user_agent',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Inspection, $this>
     */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function signerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signer_user_id');
    }
}
