<?php

namespace App\Policies;

use App\Models\AttendanceCorrection;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AttendanceCorrectionPolicy
{
    use HandlesAuthorization;

    /** Managers+ can see all corrections; employees see only their own (handled in controller). */
    public function viewAny(User $authUser): bool
    {
        return true; // scoping enforced in controller
    }

    /** Any authenticated user may file a correction (for their own date only — enforced in controller). */
    public function create(User $authUser): bool
    {
        return true;
    }

    /** Only managers+ may approve or reject. */
    public function review(User $authUser): bool
    {
        return $authUser->hasAnyRole(['super_admin', 'admin', 'manager']);
    }
}
