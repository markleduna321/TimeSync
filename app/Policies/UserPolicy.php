<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $authUser): bool
    {
        return $authUser->hasAnyRole(['super_admin', 'admin', 'manager']);
    }

    public function view(User $authUser, User $user): bool
    {
        return $authUser->id === $user->id
            || $authUser->hasAnyRole(['super_admin', 'admin', 'manager']);
    }

    public function create(User $authUser): bool
    {
        return $authUser->hasAnyRole(['super_admin', 'admin']);
    }

    public function update(User $authUser, User $user): bool
    {
        // Admins can update anyone; users can update themselves (no role changes).
        return $authUser->hasAnyRole(['super_admin', 'admin'])
            || $authUser->id === $user->id;
    }

    public function delete(User $authUser, User $user): bool
    {
        // Cannot delete yourself.
        return $authUser->hasAnyRole(['super_admin', 'admin'])
            && $authUser->id !== $user->id;
    }

    /**
     * Managers+ can view any user's timesheet.
     * Team leads can only view timesheets of their own team members.
     * Employees can only view their own.
     */
    public function viewTimesheet(User $authUser, User $target): bool
    {
        if ($authUser->id === $target->id) {
            return true;
        }

        if ($authUser->hasAnyRole(['super_admin', 'admin', 'manager'])) {
            return true;
        }

        if ($authUser->hasRole('team_lead')) {
            return $authUser->ledTeams()
                ->whereHas('members', fn ($q) => $q->where('users.id', $target->id))
                ->exists();
        }

        return false;
    }
}

