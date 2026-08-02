<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleOverride extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'shift_start',
        'shift_end',
        'promotes_to_workday',
        'demotes_to_restday',
        'swap_date',
        'note',
        'created_by',
    ];

    protected $casts = [
        'date'                => 'date:Y-m-d',
        'promotes_to_workday' => 'boolean',
        'demotes_to_restday'  => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
