<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'suffix',
        'date_of_birth',
        'gender',
        'nationality',
        'marital_status',
        'phone_number',
        'street_address',
        'barangay',
        'city',
        'province',
        'zip_code',
        'country',
        'emergency_contact_name',
        'emergency_contact_number',
        'emergency_contact_relationship',
        'sss_number',
        'pagibig_number',
        'philhealth_number',
        'tin_number',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
