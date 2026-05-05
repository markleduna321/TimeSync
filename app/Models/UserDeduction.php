<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDeduction extends Model
{
    protected $fillable = [
        'user_id',
        'deduction_type_id',
        'description',
        'amount',
        'effective_from',
        'effective_until',
        'added_by',
        'is_active',
    ];

    protected $casts = [
        'effective_from'  => 'date',
        'effective_until' => 'date',
        'is_active'       => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deductionType(): BelongsTo
    {
        return $this->belongsTo(DeductionType::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
