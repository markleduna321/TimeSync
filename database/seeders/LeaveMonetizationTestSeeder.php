<?php

namespace Database\Seeders;

use App\Models\LeaveCredit;
use App\Models\LeaveCreditPolicy;
use App\Models\LeaveMonetization;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds 2025 leave credit balances and pending monetization records so that
 * the leave-conversion-to-payslip injection can be tested immediately.
 *
 * Run with:
 *   php artisan db:seed --class=LeaveMonetizationTestSeeder
 *
 * Safe to re-run — uses firstOrCreate / updateOrCreate throughout.
 */
class LeaveMonetizationTestSeeder extends Seeder
{
    /**
     * Leave types to create (or find if they already exist by code).
     * All marked as monetizable so they trigger the payslip injection.
     */
    private array $leaveTypeBlueprints = [
        [
            'code'           => 'VL',
            'name'           => 'Vacation Leave',
            'color'          => '#6366F1',
            'is_paid'        => true,
            'is_monetizable' => true,
            'annual_amount'  => 15.0,   // 15 days granted per year
            'used_2025'      => 7.5,    // 7.5 used → 7.5 remaining → will be monetized
        ],
        [
            'code'           => 'SIL',
            'name'           => 'Service Incentive Leave',
            'color'          => '#10B981',
            'is_paid'        => true,
            'is_monetizable' => true,
            'annual_amount'  => 5.0,    // 5 days granted per year
            'used_2025'      => 2.0,    // 2 used → 3 remaining → will be monetized
        ],
    ];

    public function run(): void
    {
        // Target: all users with a salary (admins + demo employees)
        $users = User::where('monthly_salary', '>', 0)->get();

        if ($users->isEmpty()) {
            $this->command->warn('No users with monthly_salary found. Run DemoDataSeeder first, or set a monthly_salary on at least one user.');
            return;
        }

        $this->command->info("Found {$users->count()} user(s) with salary. Seeding 2025 leave data…");

        DB::transaction(function () use ($users) {
            foreach ($this->leaveTypeBlueprints as $blueprint) {

                /* ── 1. Leave Type ─────────────────────────────── */
                $leaveType = LeaveType::firstOrCreate(
                    ['code' => $blueprint['code']],
                    [
                        'name'           => $blueprint['name'],
                        'color'          => $blueprint['color'],
                        'is_paid'        => $blueprint['is_paid'],
                        'is_active'      => true,
                        'is_monetizable' => $blueprint['is_monetizable'],
                    ]
                );

                // Ensure monetizable flag is set even on pre-existing types
                if (! $leaveType->is_monetizable) {
                    $leaveType->update(['is_monetizable' => true]);
                }

                /* ── 2. Credit Policy (annual lump) ────────────── */
                LeaveCreditPolicy::updateOrCreate(
                    ['leave_type_id' => $leaveType->id],
                    [
                        'allocation_type' => 'annual_lump',
                        'annual_amount'   => $blueprint['annual_amount'],
                        'monthly_rate'    => null,
                        'is_active'       => true,
                    ]
                );

                /* ── 3. Per-user: credit balance + monetization ── */
                foreach ($users as $user) {
                    $remainingDays = $blueprint['annual_amount'] - $blueprint['used_2025'];
                    $dailyRate     = $this->computeDailyRate($user);
                    $amount        = round($remainingDays * $dailyRate, 2);

                    // Leave Credit for 2025
                    LeaveCredit::updateOrCreate(
                        [
                            'user_id'       => $user->id,
                            'leave_type_id' => $leaveType->id,
                            'year'          => 2025,
                        ],
                        [
                            'total_credits' => $blueprint['annual_amount'],
                            'used_credits'  => $blueprint['used_2025'],
                            'carried_over'  => 0,
                        ]
                    );

                    // Pending monetization record — triggers payslip injection
                    LeaveMonetization::updateOrCreate(
                        [
                            'user_id'       => $user->id,
                            'leave_type_id' => $leaveType->id,
                            'year'          => 2025,
                        ],
                        [
                            'eligible_days'   => $remainingDays,
                            'daily_rate_used' => $dailyRate,
                            'amount'          => $amount,
                            'status'          => 'pending',
                            'notes'           => 'Test seed — 2025 year-end monetization',
                            'created_by'      => 1,
                        ]
                    );

                    $this->command->line(
                        "  [{$user->name}] {$leaveType->name}: {$remainingDays} days × ₱" .
                        number_format($dailyRate, 2) . " = ₱" . number_format($amount, 2) . " (pending)"
                    );
                }
            }
        });

        $this->command->newLine();
        $this->command->info('Done! Now generate a payslip for any of these users to see the Leave Conversion lines auto-injected.');
    }

    /**
     * Mirrors the formula used in PayslipComputationService / LeaveMonetizationService.
     * daily rate = monthly_salary / (52 weeks × work_days_per_week / 12 months)
     */
    private function computeDailyRate(User $user): float
    {
        $salary      = (float) ($user->monthly_salary ?? 0);
        $daysPerWeek = count($user->schedule?->work_days ?? []) ?: 5;

        if ($salary <= 0) {
            return 0.0;
        }

        return round($salary / (52 * $daysPerWeek / 12), 4);
    }
}
