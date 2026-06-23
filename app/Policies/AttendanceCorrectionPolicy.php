<?php

namespace App\Policies;

use App\Models\AttendanceCorrection;
use App\Models\Team;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AttendanceCorrectionPolicy
{
    use HandlesAuthorization;

    /** All authenticated users can view the index (scoping is enforced in the controller). */
    public function viewAny(User $authUser): bool
    {
        return true;
    }

    /**
     * A user can file a correction/OT request if they hold a non-admin filing role.
     * - employee, team_lead, manager  → can always file for themselves.
     * - admin / super_admin only      → cannot file (approvers only).
     * - admin + employee              → CAN file (employee role grants the right).
     */
    public function create(User $authUser): bool
    {
        return $authUser->hasAnyRole(['employee', 'team_lead', 'manager']);
    }

    /**
     * Tiered approval:
     *  - super_admin / admin  → can review any correction.
     *  - manager              → can review corrections filed by team_leads who belong to
     *                           teams where the manager is assigned as manager.
     *  - team_lead            → can review corrections filed by members of teams they lead
     *                           (excludes other team_leads and their own corrections).
     *  - employee             → never.
     */
    public function review(User $authUser, AttendanceCorrection $correction): bool
    {
        // Cannot review your own correction.
        if ($authUser->id === $correction->user_id) {
            return false;
        }

        // Super admins and admins can review anything.
        if ($authUser->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        $subject = $correction->user; // the person who filed the correction

        // Manager: can review corrections filed by team_leads in their managed teams.
        if ($authUser->hasRole('manager') && !$authUser->hasAnyRole(['super_admin', 'admin'])) {
            if (! $subject->hasRole('team_lead')) {
                return false;
            }
            // Subject must be a team_lead in a team managed by authUser.
            return Team::where('manager_id', $authUser->id)
                ->whereHas('members', fn ($q) => $q->where('users.id', $subject->id))
                ->exists();
        }

        // Team Lead: can review corrections filed by regular members of their led teams
        // (the member must NOT be a team_lead — those go to the manager).
        if ($authUser->hasRole('team_lead') && !$authUser->hasAnyRole(['super_admin', 'admin', 'manager'])) {
            if ($subject->hasRole('team_lead')) {
                return false; // team_lead corrections are escalated to manager
            }
            return Team::where('leader_id', $authUser->id)
                ->whereHas('members', fn ($q) => $q->where('users.id', $subject->id))
                ->exists();
        }

        return false;
    }

    /**
     * Only super_admin and admin can soft-delete (remove) a correction so the
     * employee can re-file.
     */
    public function delete(User $authUser, AttendanceCorrection $correction): bool
    {
        return $authUser->hasAnyRole(['super_admin', 'admin']);
    }
}

