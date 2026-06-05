<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserExperience;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserExperiencePolicy
{
    use HandlesAuthorization;

    public function update(User $authUser, UserExperience $experience): bool
    {
        return $authUser->id === $experience->user_id;
    }

    public function delete(User $authUser, UserExperience $experience): bool
    {
        return $authUser->id === $experience->user_id;
    }
}
