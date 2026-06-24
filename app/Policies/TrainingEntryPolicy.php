<?php

namespace App\Policies;

use App\Models\TrainingEntry;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TrainingEntryPolicy
{
    use HandlesAuthorization;

    /**
     * Gate::before() already grants access to super_admin, admin, manager.
     * This method only needs to handle team_lead.
     *
     * Called as: $this->authorize('create', [TrainingEntry::class, $targetUser])
     */
    public function create(User $auth, User $target): bool
    {
        if ($auth->hasRole('team_lead')) {
            return $this->leadsUser($auth, $target->id);
        }

        return false;
    }

    /**
     * Called as: $this->authorize('delete', $entry)
     */
    public function delete(User $auth, TrainingEntry $entry): bool
    {
        if ($auth->hasRole('team_lead')) {
            return $this->leadsUser($auth, $entry->user_id);
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
