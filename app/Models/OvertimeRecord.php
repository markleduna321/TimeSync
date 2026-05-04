<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeRecord extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'start_time',
        'end_time',
        'total_minutes',
        'correction_id',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'date'        => 'date',
        'approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function correction(): BelongsTo
    {
        return $this->belongsTo(AttendanceCorrection::class, 'correction_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
