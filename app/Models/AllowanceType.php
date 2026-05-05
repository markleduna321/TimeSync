<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AllowanceType extends Model
{
    protected $fillable = [
        'name',
        'code',
        'is_taxable',
        'monthly_de_minimis_limit',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_taxable'               => 'boolean',
        'monthly_de_minimis_limit' => 'decimal:2',
        'is_active'                => 'boolean',
    ];

    public function userAllowances(): HasMany
    {
        return $this->hasMany(UserAllowance::class);
    }
}
