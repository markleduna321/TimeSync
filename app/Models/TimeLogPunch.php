<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeLogPunch extends Model
{
    protected $fillable = [
        'device_log_id',
        'user_id',
        'date',
        'punched_at',
        'log_type',
    ];

    protected $casts = [
        'date'      => 'date',
        'punched_at'=> 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
