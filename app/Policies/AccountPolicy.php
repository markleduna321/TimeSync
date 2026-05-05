<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\User;

class AccountPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }

    public function update(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }

    public function delete(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }
}
