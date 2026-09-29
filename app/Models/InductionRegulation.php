<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class InductionRegulation extends Model
{
    protected $fillable = [
        'induction_id',
        'original_name',
        'path',
        'uploaded_by',
    ];

    protected static function booted(): void
    {
        static::deleting(function (InductionRegulation $regulation): void {
            if ($regulation->path) {
                Storage::disk('public')->delete($regulation->path);
            }
        });
    }

    public function induction(): BelongsTo
    {
        return $this->belongsTo(Induction::class);
    }
}
