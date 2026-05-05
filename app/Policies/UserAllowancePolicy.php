<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserAllowance;

class UserAllowancePolicy
{
    public function viewAny(User $auth, User $targetUser): bool
    {
        return $auth->id === $targetUser->id || $auth->hasAnyRole(['super_admin', 'admin']);
    }

    public function create(User $auth): bool
    {
        return $auth->hasAnyRole(['super_admin', 'admin']);
    }

    public function delete(User $auth, UserAllowance $allowance): bool
    {
        return $auth->hasAnyRole(['super_admin', 'admin']);
    }
}
