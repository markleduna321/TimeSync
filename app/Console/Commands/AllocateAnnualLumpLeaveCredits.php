<?php

namespace App\Console\Commands;

use App\Models\LeaveCredit;
use App\Models\LeaveCreditPolicy;
use App\Models\LeaveCreditTransaction;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AllocateAnnualLumpLeaveCredits extends Command
{
    protected $signature   = 'leave:allocate-annual {year? : Target year (defaults to current year)} {--force : Re-allocate even if a record already exists}';
    protected $description = 'Allocate annual lump-sum leave credits for all active users at the start of a new year.';

    public function handle(): int
    {
        $year = (int) ($this->argument('year') ?? now()->year);

        $policies = LeaveCreditPolicy::with('leaveType')
            ->where('allocation_type', 'annual_lump')
            ->where('is_active', true)
            ->whereNotNull('annual_amount')
            ->where('annual_amount', '>', 0)
            ->get();

        if ($policies->isEmpty()) {
            $this->info('No active annual-lump policies found. Nothing to do.');
            return self::SUCCESS;
        }

        $users     = User::whereNull('deleted_at')->get();
        $allocated = 0;
        $skipped   = 0;
        $force     = $this->option('force');

        DB::transaction(function () use ($users, $policies, $year, $force, &$allocated, &$skipped) {
            foreach ($users as $user) {
                foreach ($policies as $policy) {
                    $existing = LeaveCredit::where('user_id', $user->id)
                        ->where('leave_type_id', $policy->leave_type_id)
                        ->where('year', $year)
                        ->first();

                    if ($existing) {
                        if (!$force) {
                            // Already has a record for this year — skip to avoid double-granting.
                            $skipped++;
                            continue;
                        }
                        // Force: set total_credits to annual_amount, reset used/carried
                        $old                        = (float) $existing->total_credits;
                        $existing->total_credits    = $policy->annual_amount;
                        $existing->used_credits     = 0;
                        $existing->carried_over     = 0;
                        $existing->save();

                        LeaveCreditTransaction::create([
                            'user_id'        => $user->id,
                            'leave_type_id'  => $policy->leave_type_id,
                            'type'           => 'credit',
                            'amount'         => $policy->annual_amount,
                            'reference_type' => 'annual_lump',
                            'note'           => "Annual lump-sum re-allocation (force) — {$year} | {$policy->leaveType->name}",
                            'created_by'     => null,
                        ]);
                    } else {
                        LeaveCredit::create([
                            'user_id'       => $user->id,
                            'leave_type_id' => $policy->leave_type_id,
                            'year'          => $year,
                            'total_credits' => $policy->annual_amount,
                            'used_credits'  => 0,
                            'carried_over'  => 0,
                        ]);

                        LeaveCreditTransaction::create([
                            'user_id'        => $user->id,
                            'leave_type_id'  => $policy->leave_type_id,
                            'type'           => 'credit',
                            'amount'         => $policy->annual_amount,
                            'reference_type' => 'annual_lump',
                            'note'           => "Annual lump-sum allocation — {$year} | {$policy->leaveType->name}",
                            'created_by'     => null,
                        ]);
                    }

                    $allocated++;
                }
            }
        });

        $this->info("Annual lump-sum credits allocated: {$allocated} record(s) created/updated, {$skipped} skipped (already exist).");
        return self::SUCCESS;
    }
}
