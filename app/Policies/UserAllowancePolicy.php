<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserAllowance;

class UserAllowancePolicy
{
    public function viewAny(User $auth, User $targetUser): bool
    {
        return $auth->id === $targetUser->id || $auth->highestRoleLevel() >= 4;
    }

    public function create(User $auth): bool
    {
        return $auth->highestRoleLevel() >= 4;
    }

    public function delete(User $auth, UserAllowance $allowance): bool
    {
        return $auth->highestRoleLevel() >= 4;
    }
}
