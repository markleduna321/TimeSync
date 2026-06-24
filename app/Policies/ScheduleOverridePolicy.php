<?php

namespace App\Policies;

use App\Models\ScheduleOverride;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ScheduleOverridePolicy
{
    use HandlesAuthorization;

    /**
     * Gate::before() already grants access to super_admin, admin, manager.
     * This method only needs to handle team_lead — they may manage overrides
     * for employees who belong to teams they lead.
     *
     * Called as: $this->authorize('create', [ScheduleOverride::class, $targetUser])
     */
    public function create(User $auth, User $target): bool
    {
        if ($auth->hasRole('team_lead')) {
            return $this->leadsUser($auth, $target->id);
        }

        return false;
    }

    /**
     * Called as: $this->authorize('delete', $override)
     */
    public function delete(User $auth, ScheduleOverride $override): bool
    {
        if ($auth->hasRole('team_lead')) {
            return $this->leadsUser($auth, $override->user_id);
        }

        return false;
    }

    private function leadsUser(User $auth, int $targetId): bool
    {
        return $auth->ledTeams()
            ->whereHas('members', fn ($q) => $q->where('users.id', $targetId))
            ->exists();
    }
}
