<?php

namespace App\Policies;

use App\Models\LeaveApplication;
use App\Models\Team;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\DB;

class LeaveApplicationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can view (scoped in controller)
    }

    public function create(User $user): bool
    {
        return true; // Any authenticated user can file a leave
    }

    public function review(User $reviewer, LeaveApplication $application): bool
    {
        if ($reviewer->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        $filer = $application->user;

        if ($reviewer->hasRole('manager')) {
            $managedTeamIds = Team::where('manager_id', $reviewer->id)->pluck('id');
            return DB::table('team_user')
                ->whereIn('team_id', $managedTeamIds)
                ->where('user_id', $filer->id)
                ->exists();
        }

        if ($reviewer->hasRole('team_lead')) {
            $ledTeamIds = Team::where('leader_id', $reviewer->id)->pluck('id');
            return DB::table('team_user')
                ->whereIn('team_id', $ledTeamIds)
                ->where('user_id', $filer->id)
                ->exists();
        }

        return false;
    }

    public function delete(User $user, LeaveApplication $application): bool
    {
        // Employee can cancel their own pending application
        return $user->id === $application->user_id
            && $application->status === 'pending';
    }
}
