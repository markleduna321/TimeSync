<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingEntry extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'hours',
        'description',
        'created_by',
    ];

    protected $casts = [
        'date'  => 'date:Y-m-d',
        'hours' => 'float',
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
