<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserProfilePolicy
{
    use HandlesAuthorization;

    /** Any authenticated user may view/update their own profile. */
    public function view(User $authUser, UserProfile $profile): bool
    {
        return $authUser->id === $profile->user_id
            || $authUser->hasAnyRole(['super_admin', 'admin']);
    }

    public function update(User $authUser, UserProfile $profile): bool
    {
        return $authUser->id === $profile->user_id;
    }
}
