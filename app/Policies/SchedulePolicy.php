<?php

namespace App\Policies;

use App\Models\Schedule;
use App\Models\User;

class SchedulePolicy
{
    private function isPrivileged(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'manager']);
    }

    public function viewAny(User $user): bool
    {
        return $this->isPrivileged($user)
            || $user->hasRole('team_lead');
    }

    public function view(User $user, Schedule $schedule): bool
    {
        return $this->isPrivileged($user)
            || $user->id === $schedule->user_id
            || $this->isTeamMember($user, $schedule->user_id);
    }

    public function create(User $user): bool
    {
        return $this->isPrivileged($user);
    }

    public function update(User $user, Schedule $schedule): bool
    {
        return $this->isPrivileged($user)
            || ($user->hasRole('team_lead') && $this->isTeamMember($user, $schedule->user_id));
    }

    /** Returns true if $targetUserId is in any team led by $user. */
    private function isTeamMember(User $user, int $targetUserId): bool
    {
        return $user->ledTeams()
            ->whereHas('members', fn ($q) => $q->where('users.id', $targetUserId))
            ->exists();
    }
}
