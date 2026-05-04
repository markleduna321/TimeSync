<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserBreakConfig;

class BreakConfigPolicy
{
    private function isAdmin(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin']);
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, UserBreakConfig $config): bool
    {
        return $this->isAdmin($user) || $user->id === $config->user_id;
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, UserBreakConfig $config): bool
    {
        return $this->isAdmin($user);
    }
}
