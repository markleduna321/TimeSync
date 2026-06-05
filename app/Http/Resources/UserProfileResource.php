<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user    = $this->resource['user'];
        $profile = $this->resource['profile']; // UserProfile model or null
        $hasResume = $this->resource['has_resume'];

        // ── Completion calculation ─────────────────────────────────────────────
        // 10 tracked fields × 10% each = 100%
        $checks = [
            !empty($user->first_name),
            !empty($user->last_name),
            !empty($user->avatar),
            $profile && !empty($profile->phone_number),
            $profile && !empty($profile->date_of_birth),
            $profile && !empty($profile->gender),
            $profile && !empty($profile->city),
            $profile && !empty($profile->emergency_contact_name),
            $profile && !empty($profile->sss_number),
            $hasResume,
        ];
        $completionPercentage = (int)(array_sum($checks) * 10);

        return [
            // User identity fields
            'id'         => $user->id,
            'first_name' => $user->first_name,
            'middle_name'=> $user->middle_name,
            'last_name'  => $user->last_name,
            'name'       => $user->name,
            'email'      => $user->email,
            'avatar_url' => $user->avatar ? asset('storage/' . $user->avatar) : null,
            'roles'      => $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),

            // Extended profile fields (null-safe)
            'suffix'          => $profile?->suffix,
            'date_of_birth'   => $profile?->date_of_birth?->toDateString(),
            'gender'          => $profile?->gender,
            'nationality'     => $profile?->nationality ?? 'Filipino',
            'marital_status'  => $profile?->marital_status,
            'phone_number'    => $profile?->phone_number,

            // Address
            'street_address'  => $profile?->street_address,
            'barangay'        => $profile?->barangay,
            'city'            => $profile?->city,
            'province'        => $profile?->province,
            'zip_code'        => $profile?->zip_code,
            'country'         => $profile?->country ?? 'Philippines',

            // Emergency contact
            'emergency_contact_name'         => $profile?->emergency_contact_name,
            'emergency_contact_number'       => $profile?->emergency_contact_number,
            'emergency_contact_relationship' => $profile?->emergency_contact_relationship,

            // Government IDs
            'sss_number'        => $profile?->sss_number,
            'pagibig_number'    => $profile?->pagibig_number,
            'philhealth_number' => $profile?->philhealth_number,
            'tin_number'        => $profile?->tin_number,

            // Computed
            'completion_percentage' => $completionPercentage,
            'completion_missing'    => $this->missingFields($user, $profile, $hasResume),
        ];
    }

    private function missingFields($user, $profile, bool $hasResume): array
    {
        $missing = [];
        if (empty($user->first_name))                       $missing[] = 'First Name';
        if (empty($user->last_name))                        $missing[] = 'Last Name';
        if (empty($user->avatar))                           $missing[] = 'Profile Picture';
        if (!$profile || empty($profile->phone_number))     $missing[] = 'Phone Number';
        if (!$profile || empty($profile->date_of_birth))    $missing[] = 'Date of Birth';
        if (!$profile || empty($profile->gender))           $missing[] = 'Gender';
        if (!$profile || empty($profile->city))             $missing[] = 'City / Municipality';
        if (!$profile || empty($profile->emergency_contact_name)) $missing[] = 'Emergency Contact';
        if (!$profile || empty($profile->sss_number))       $missing[] = 'SSS Number';
        if (!$hasResume)                                    $missing[] = 'Resume';
        return $missing;
    }
}
