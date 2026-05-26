<?php

namespace App\Services;

use App\Models\LeaveCredit;
use App\Models\LeaveCreditTransaction;
use App\Models\LeaveMonetization;
use Illuminate\Support\Facades\DB;

class LeaveMonetizationService
{
    public function __construct(
        private PayslipComputationService $payslip,
    ) {}

    /**
     * Run year-end monetization for all users with unused monetizable leave credits.
     *
     * @param  int   $year       The closing year (must be <= current year when forced, < current year normally).
     * @param  int   $createdBy  The user ID triggering the run.
     * @param  bool  $force      Allow running for the current year.
     * @return array{created: int, skipped: int, errors: array}
     */
    public function run(int $year, int $createdBy, bool $force = false): array
    {
        $created = 0;
        $skipped = 0;
        $errors  = [];

        $credits = LeaveCredit::with(['user.schedule', 'leaveType'])
            ->where('year', $year)
            ->whereHas('leaveType', fn ($q) => $q->where('is_monetizable', true))
            ->get()
            ->filter(fn ($c) => $c->balance > 0);

        foreach ($credits as $credit) {
            // Skip if a record already exists for this user+type+year
            $exists = LeaveMonetization::where('user_id', $credit->user_id)
                ->where('leave_type_id', $credit->leave_type_id)
                ->where('year', $year)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            $user          = $credit->user;
            $monthlySalary = (float) ($user->monthly_salary ?? 0);

            if ($monthlySalary <= 0) {
                $errors[] = "User [{$user->name}] has no monthly salary — skipped.";
                $skipped++;
                continue;
            }

            $daysPerWeek  = count($user->schedule?->work_days ?? []) ?: 5;
            $dailyRate    = $this->payslip->computeDailyRate($monthlySalary, $daysPerWeek);
            $eligibleDays = (float) $credit->balance;
            $amount       = round($eligibleDays * $dailyRate, 2);

            DB::transaction(function () use ($credit, $year, $eligibleDays, $dailyRate, $amount, $createdBy) {
                LeaveMonetization::create([
                    'user_id'        => $credit->user_id,
                    'leave_type_id'  => $credit->leave_type_id,
                    'year'           => $year,
                    'eligible_days'  => $eligibleDays,
                    'daily_rate_used'=> $dailyRate,
                    'amount'         => $amount,
                    'status'         => 'pending',
                    'created_by'     => $createdBy,
                ]);

                LeaveCreditTransaction::create([
                    'user_id'        => $credit->user_id,
                    'leave_type_id'  => $credit->leave_type_id,
                    'type'           => 'debit',
                    'amount'         => $eligibleDays,
                    'reference_type' => 'LeaveMonetization',
                    'reference_id'   => null,
                    'note'           => "Year-end monetization: {$eligibleDays} days × ₱{$dailyRate}/day = ₱{$amount}",
                    'created_by'     => $createdBy,
                ]);

                // Zero out the remaining balance by incrementing used_credits
                $credit->increment('used_credits', $eligibleDays);
            });

            $created++;
        }

        return compact('created', 'skipped', 'errors');
    }
}
