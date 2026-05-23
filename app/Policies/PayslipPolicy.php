<?php

namespace App\Policies;

use App\Models\Payslip;
use App\Models\User;

class PayslipPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // employees see their own; admin sees all — filtered in controller
    }

    public function view(User $user, Payslip $payslip): bool
    {
        if ($user->id === $payslip->user_id) {
            return true;
        }
        return $user->hasAnyRole(['super_admin', 'admin']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }

    public function update(User $user, Payslip $payslip): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin']);
    }

    public function delete(User $user, Payslip $payslip): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin'])
            && $payslip->status === 'draft';
    }
}
