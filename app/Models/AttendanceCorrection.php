<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceCorrection extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'date',
        'type',
        'reason',
        'proof_path',
        'requested_clock_in',
        'requested_clock_out',
        'requested_lunch_start',
        'requested_lunch_end',
        'requested_breaks',
        'effective_shift_start',
        'effective_shift_end',
        'status',
        'reviewed_by',
        'reviewed_at',
        'admin_note',
        'deleted_by',
        'deleted_reason',
    ];

    protected $casts = [
        'date'             => 'date',
        'requested_breaks' => 'array',
        'reviewed_at'      => 'datetime',
        'deleted_at'       => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function history(): HasMany
    {
        return $this->hasMany(TimeLogHistory::class, 'correction_id')->orderBy('created_at');
    }
}
