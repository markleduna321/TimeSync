<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LeaveType extends Model
{
    protected $fillable = [
        'name',
        'code',
        'color',
        'min_advance_days',
        'max_consecutive_days',
        'requires_proof_above_days',
        'is_paid',
        'is_active',
        'is_monetizable',
    ];

    protected $casts = [
        'is_paid'         => 'boolean',
        'is_active'       => 'boolean',
        'is_monetizable'  => 'boolean',
    ];

    public function creditPolicy(): HasOne
    {
        return $this->hasOne(LeaveCreditPolicy::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function credits(): HasMany
    {
        return $this->hasMany(LeaveCredit::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LeaveCreditTransaction::class);
    }
}
