<?php

namespace App\Console\Commands;

use App\Models\LeaveCredit;
use App\Models\LeaveCreditPolicy;
use App\Models\LeaveCreditTransaction;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AccrueMonthlyLeaveCredits extends Command
{
    protected $signature   = 'leave:accrue-monthly';
    protected $description = 'Accrue monthly leave credits for all active users based on their leave credit policies.';

    public function handle(): int
    {
        $year     = now()->year;
        $policies = LeaveCreditPolicy::with('leaveType')
            ->where('allocation_type', 'monthly_accrual')
            ->where('is_active', true)
            ->get();

        if ($policies->isEmpty()) {
            $this->info('No active monthly-accrual policies found. Nothing to do.');
            return self::SUCCESS;
        }

        $users = User::whereNull('deleted_at')->get();

        DB::transaction(function () use ($users, $policies, $year) {
            foreach ($users as $user) {
                foreach ($policies as $policy) {
                    $credit = LeaveCredit::firstOrCreate(
                        [
                            'user_id'       => $user->id,
                            'leave_type_id' => $policy->leave_type_id,
                            'year'          => $year,
                        ],
                        [
                            'total_credits' => 0,
                            'used_credits'  => 0,
                            'carried_over'  => 0,
                        ]
                    );

                    // Skip accrual for records just created this run —
                    // they'll be picked up next month.
                    if ($credit->wasRecentlyCreated) {
                        continue;
                    }

                    $credit->increment('total_credits', $policy->monthly_rate);

                    LeaveCreditTransaction::create([
                        'user_id'        => $user->id,
                        'leave_type_id'  => $policy->leave_type_id,
                        'type'           => 'credit',
                        'amount'         => $policy->monthly_rate,
                        'reference_type' => 'accrual',
                        'note'           => 'Monthly accrual — ' . now()->format('F Y'),
                        'created_by'     => null,
                    ]);
                }
            }
        });

        $this->info("Monthly leave credits accrued for {$users->count()} user(s) across {$policies->count()} leave type(s).");
        return self::SUCCESS;
    }
}
