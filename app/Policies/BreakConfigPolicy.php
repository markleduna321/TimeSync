<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserBreakConfig;

class BreakConfigPolicy
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

    public function view(User $user, UserBreakConfig $config): bool
    {
        return $this->isPrivileged($user)
            || $user->id === $config->user_id
            || $this->isTeamMember($user, $config->user_id);
    }

    public function create(User $user): bool
    {
        return $this->isPrivileged($user);
    }

    public function update(User $user, UserBreakConfig $config): bool
    {
        return $this->isPrivileged($user)
            || ($user->hasRole('team_lead') && $this->isTeamMember($user, $config->user_id));
    }

    private function isTeamMember(User $user, int $targetUserId): bool
    {
        return $user->ledTeams()
            ->whereHas('members', fn ($q) => $q->where('users.id', $targetUserId))
            ->exists();
    }
}
