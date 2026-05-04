<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'manager', 'team_lead']);
    }

    public function view(User $user, Team $team): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'manager'])
            || ($user->hasRole('team_lead') && $team->leader_id === $user->id);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'manager']);
    }

    public function update(User $user, Team $team): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'manager'])
            || ($user->hasRole('team_lead') && $team->leader_id === $user->id);
    }

    public function delete(User $user, Team $team): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'manager']);
    }
}
