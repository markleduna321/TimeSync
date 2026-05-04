<?php

namespace App\Policies;

use App\Models\TimeLog;
use App\Models\User;

class TimeLogPolicy
{
    private function isAdmin(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin']);
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, TimeLog $timeLog): bool
    {
        return $this->isAdmin($user) || $user->id === $timeLog->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, TimeLog $timeLog): bool
    {
        return $user->id === $timeLog->user_id;
    }
}
