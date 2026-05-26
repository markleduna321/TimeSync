<?php

namespace Database\Seeders;

use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds draft 13th month payslips for 2024 and 2025 so the admin page and
 * employee preview can be tested immediately without requiring a full year of
 * released payslips.
 *
 * Calculation (mirrors ThirteenthMonthController logic):
 *   - Simulates 12 months of basic pay using each user's monthly_salary.
 *   - amount      = monthly_salary          (sum_basic_pay / 12 == monthly_salary)
 *   - non_taxable = min(90_000, amount)     — TRAIN Law ₱90,000 exemption
 *   - taxable     = max(0, amount - 90_000) — taxable excess (if any)
 *
 * Run with:
 *   php artisan db:seed --class=ThirteenthMonthTestSeeder
 *
 * Safe to re-run — skips any year/user that already has a 13th month payslip.
 */
class ThirteenthMonthTestSeeder extends Seeder
{
    private const YEARS = [2024, 2025];

    public function run(): void
    {
        $users = User::where('monthly_salary', '>', 0)->get();

        if ($users->isEmpty()) {
            $this->command->warn('No users with monthly_salary > 0 found. Seed employees first.');
            return;
        }

        // Use the first admin/super_admin as the operator (generated_by)
        $operator = User::whereHas('roles', fn ($q) => $q->whereIn('slug', ['super_admin', 'admin']))
            ->first() ?? $users->first();

        $this->command->info("Seeding 13th month payslips for years " . implode(', ', self::YEARS) . "…");

        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($users, $operator, &$created, &$skipped) {
            foreach (self::YEARS as $year) {
                foreach ($users as $employee) {
                    // Skip if already exists for this employee + year
                    $exists = Payslip::where('user_id', $employee->id)
                        ->where('cutoff_type', '13th_month')
                        ->whereYear('period_start', $year)
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    $amount     = (float) $employee->monthly_salary;
                    $nonTaxable = min(90_000.0, $amount);
                    $taxable    = max(0.0, $amount - 90_000.0);

                    $payslip = Payslip::create([
                        'user_id'             => $employee->id,
                        'period_start'        => "{$year}-01-01",
                        'period_end'          => "{$year}-12-31",
                        'pay_date'            => "{$year}-12-20",
                        'monthly_salary'      => $employee->monthly_salary,
                        'daily_rate'          => 0,
                        'basic_pay'           => $amount,
                        'gross_pay'           => $amount,
                        'total_deductions'    => 0,
                        'net_pay'             => $amount,
                        'days_scheduled'      => 0,
                        'days_worked'         => 0,
                        'days_absent'         => 0,
                        'late_minutes'        => 0,
                        'undertime_minutes'   => 0,
                        'over_break_minutes'  => 0,
                        'ot_minutes'          => 0,
                        'rest_day_minutes'    => 0,
                        'rest_day_ot_minutes' => 0,
                        'taxable_income'      => $taxable,
                        'status'              => 'draft',
                        'cutoff_type'         => '13th_month',
                        'generated_by'        => $operator->id,
                    ]);

                    PayslipLine::create([
                        'payslip_id'  => $payslip->id,
                        'category'    => 'earning',
                        'code'        => '13TH_NONTAX',
                        'description' => "13th Month Pay — Non-Taxable (₱90,000 exemption per TRAIN Law)",
                        'sort_order'  => 1,
                        'amount'      => $nonTaxable,
                        'is_taxable'  => false,
                    ]);

                    if ($taxable > 0) {
                        PayslipLine::create([
                            'payslip_id'  => $payslip->id,
                            'category'    => 'earning',
                            'code'        => '13TH_TAXABLE',
                            'description' => "13th Month Pay — Taxable Excess (TRAIN Law; include in Dec WHT)",
                            'sort_order'  => 2,
                            'amount'      => $taxable,
                            'is_taxable'  => true,
                        ]);
                    }

                    $created++;
                }
            }
        });

        $this->command->info("Done. Created: {$created} | Skipped (already exist): {$skipped}");
    }
}
