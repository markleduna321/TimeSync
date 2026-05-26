<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveMonetization extends Model
{
    protected $fillable = [
        'user_id',
        'leave_type_id',
        'year',
        'eligible_days',
        'daily_rate_used',
        'amount',
        'status',
        'notes',
        'processed_at',
        'processed_by',
        'created_by',
    ];

    protected $casts = [
        'eligible_days'   => 'decimal:2',
        'daily_rate_used' => 'decimal:2',
        'amount'          => 'decimal:2',
        'processed_at'    => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
