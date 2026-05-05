<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeductionType extends Model
{
    protected $fillable = ['code', 'name', 'is_government', 'is_auto_computed', 'is_assignable', 'is_active'];

    protected $casts = [
        'is_government'    => 'boolean',
        'is_auto_computed' => 'boolean',
        'is_assignable'    => 'boolean',
        'is_active'        => 'boolean',
    ];

    public function userDeductions(): HasMany
    {
        return $this->hasMany(UserDeduction::class);
    }
}
