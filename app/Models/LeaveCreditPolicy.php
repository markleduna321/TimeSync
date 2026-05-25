<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveCreditPolicy extends Model
{
    protected $fillable = [
        'leave_type_id',
        'allocation_type',
        'monthly_rate',
        'annual_amount',
        'is_active',
    ];

    protected $casts = [
        'monthly_rate'  => 'decimal:2',
        'annual_amount' => 'decimal:2',
        'is_active'     => 'boolean',
    ];

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }
}
