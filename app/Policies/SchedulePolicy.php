<?php

namespace App\Policies;

use App\Models\Schedule;
use App\Models\User;

class SchedulePolicy
{
    private function isAdmin(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin']);
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, Schedule $schedule): bool
    {
        return $this->isAdmin($user) || $user->id === $schedule->user_id;
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, Schedule $schedule): bool
    {
        return $this->isAdmin($user);
    }
}
