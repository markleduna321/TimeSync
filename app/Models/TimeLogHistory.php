<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeLogHistory extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'time_log_id',
        'old_clock_in',
        'old_clock_out',
        'new_clock_in',
        'new_clock_out',
        'correction_id',
        'changed_by',
    ];

    protected $casts = [
        'date'          => 'date',
        'old_clock_in'  => 'datetime',
        'old_clock_out' => 'datetime',
        'new_clock_in'  => 'datetime',
        'new_clock_out' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function timeLog(): BelongsTo
    {
        return $this->belongsTo(TimeLog::class);
    }

    public function correction(): BelongsTo
    {
        return $this->belongsTo(AttendanceCorrection::class, 'correction_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
