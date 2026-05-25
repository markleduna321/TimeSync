<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveCredit extends Model
{
    protected $fillable = [
        'user_id',
        'leave_type_id',
        'year',
        'total_credits',
        'used_credits',
        'carried_over',
    ];

    protected $casts = [
        'total_credits' => 'decimal:2',
        'used_credits'  => 'decimal:2',
        'carried_over'  => 'decimal:2',
    ];

    /** Remaining balance — never stored, always computed. */
    public function getBalanceAttribute(): float
    {
        return (float) $this->total_credits
             + (float) $this->carried_over
             - (float) $this->used_credits;
    }

    protected $appends = ['balance'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }
}
