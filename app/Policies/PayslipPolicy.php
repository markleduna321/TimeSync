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
        // Employees can only see their own released payslips
        if ($user->id === $payslip->user_id) {
            return $payslip->status === 'released';
        }
        return $user->hasAnyRole(['super_admin', 'admin', 'manager']);
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
