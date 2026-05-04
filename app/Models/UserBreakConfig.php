<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBreakConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'break_allowed',
        'break_count',
        'break_duration_minutes',
        'lunch_duration_minutes',
    ];

    protected $casts = [
        'break_allowed'          => 'boolean',
        'break_count'            => 'integer',
        'break_duration_minutes' => 'integer',
        'lunch_duration_minutes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
