<?php

namespace Database\Seeders;

use App\Models\Holiday;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\Role;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use App\Services\PayslipComputationService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * CrossMidnightPayslipSeeder
 *
 * Creates a dedicated "Night-Shift Demo" employee and seeds four cross-midnight
 * shift + holiday scenarios for April 2026.  After running, log in as the
 * employee and open the Payslips page to manually verify the holiday premium
 * amounts match the expected figures printed at the end of this seeder.
 *
 * Run command:
 *   php artisan db:seed --class=CrossMidnightPayslipSeeder
 *
 * Credentials:
 *   Email    : nightdemo@demo.com
 *   Password : password
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MATH REFERENCE  (monthly_salary = ₱30,000  /  Mon–Fri / divisor 22)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Daily rate  = 30,000 ÷ 22          = ₱1,363.6364
 *  Hourly rate = 1,363.6364 ÷ 8       = ₱ 170.4545
 *
 *  Period  :  2026-04-01 → 2026-04-15  (first cutoff)
 *
 *  Holidays in window
 *  ───────────────────────────────────────────────
 *  2026-04-02  Maundy Thursday     special
 *  2026-04-03  Good Friday         regular
 *  2026-04-04  Black Saturday      special   (Saturday = rest day)
 *  2026-04-09  Araw ng Kagitingan  regular
 *
 *  Schedule: shift_start = 22:00, shift_end = 06:00 (next day)
 *  All logs are full 8-hour night shifts (22:00 → 06:00 Manila) stored in UTC.
 *    Manila 22:00 = UTC 14:00 (same calendar date)
 *    Manila 06:00 = UTC 22:00 (same calendar date as the shift-start date)
 *
 *  Cross-midnight scenarios & expected HOLIDAY_PAY contributions
 *  ───────────────────────────────────────────────────────────────────────────
 *  Log Apr 01  22:00→Apr 02 06:00  (Normal → Maundy Thu/special, 6h post-midnight)
 *    + ₱ 306.82   (170.45 × 0.30 × 6h)
 *
 *  Log Apr 02  22:00→Apr 03 06:00  (Maundy Thu/special → Good Fri/regular)
 *    + ₱ 102.27   pre-midnight  2h special   (170.45 × 0.30 × 2h)
 *    + ₱1,022.73  post-midnight 6h regular   (170.45 × 1.00 × 6h)
 *
 *  Apr 03 cursor – Good Friday, no log → guarantee (days_worked method)
 *    + ₱1,363.64
 *
 *  Log Apr 08  22:00→Apr 09 06:00  (Normal → Araw ng Kagitingan/regular, 6h post)
 *    + ₱1,022.73  (170.45 × 1.00 × 6h)
 *
 *  Apr 09 cursor – Araw ng Kagitingan, no log → guarantee
 *    + ₱1,363.64
 *
 *  ─────────────────────────────────
 *  Expected HOLIDAY_PAY total ≈ ₱5,181.83
 *  ─────────────────────────────────
 *  Days worked (logged) = 9  →  basic_pay ≈ ₱12,272.73
 *  Night diff (9 × 480 min)  →  nd_pay    ≈  ₱1,227.27
 * ─────────────────────────────────────────────────────────────────────────────
 */
class CrossMidnightPayslipSeeder extends Seeder
{
    public function __construct(private PayslipComputationService $payroll) {}

    public function run(): void
    {
        // ── 1. Holidays (idempotent) ──────────────────────────────────────────
        $this->seedHolidays();

        // ── 2. Employee ───────────────────────────────────────────────────────
        $employee = $this->seedEmployee();

        // ── 3. Disable government deductions for this QA employee ────────────
        $this->disableGovernmentDeductions($employee);

        // ── 5. Time logs ──────────────────────────────────────────────────────
        $this->seedTimeLogs($employee);

        // ── 6. Compute & release payslip ──────────────────────────────────────
        $admin = User::where('email', 'admin@gmail.com')->first()
            ?? User::whereHas('roles', fn ($q) => $q->where('slug', 'super_admin'))->first();

        if (!$admin) {
            $this->command->error('Admin user not found. Run the base seeder first.');
            return;
        }

        $periodStart = Carbon::parse('2026-04-01');
        $periodEnd   = Carbon::parse('2026-04-15');

        // Remove any existing payslip so the seeder is re-runnable
        Payslip::where('user_id', $employee->id)
            ->where('period_start', '2026-04-01')
            ->delete();

        $result = $this->payroll->compute($employee, $periodStart, $periodEnd);
        $s      = $result['summary'];

        $payslip = Payslip::create([
            'user_id'              => $employee->id,
            'period_start'         => $periodStart->toDateString(),
            'period_end'           => $periodEnd->toDateString(),
            'pay_date'             => $periodEnd->copy()->addDays(3)->toDateString(),
            'monthly_salary'       => $s['monthly_salary'],
            'daily_rate'           => $s['daily_rate'],
            'basic_pay'            => $s['basic_pay'],
            'gross_pay'            => $s['gross_pay'],
            'total_deductions'     => $s['total_deductions'],
            'net_pay'              => $s['net_pay'],
            'taxable_income'       => $s['taxable_income'],
            'days_scheduled'       => $s['days_scheduled'],
            'days_worked'          => $s['days_worked'],
            'days_absent'          => $s['days_absent'],
            'paid_leave_days'      => $s['paid_leave_days'],
            'unpaid_leave_days'    => $s['unpaid_leave_days'],
            'holiday_days'         => $s['holiday_days'],
            'holiday_days_worked'  => $s['holiday_days_worked'],
            'late_minutes'         => $s['late_minutes'],
            'undertime_minutes'    => $s['undertime_minutes'],
            'over_break_minutes'   => $s['over_break_minutes'],
            'ot_minutes'           => $s['ot_minutes'],
            'rest_day_minutes'     => $s['rest_day_minutes'],
            'rest_day_ot_minutes'  => $s['rest_day_ot_minutes'],
            'nd_minutes'           => $s['nd_minutes'],
            'cutoff_type'          => $s['cutoff_type'],
            'method'               => $s['method'],
            'status'               => 'released',
            'generated_by'         => $admin->id,
            'released_at'          => now(),
        ]);

        $sort = 0;
        foreach ($result['earnings'] as $line) {
            PayslipLine::create([
                'payslip_id'  => $payslip->id,
                'category'    => 'earning',
                'code'        => $line['code'],
                'description' => $line['description'],
                'amount'      => $line['amount'],
                'is_taxable'  => $line['is_taxable'],
                'sort_order'  => $sort++,
            ]);
        }
        foreach ($result['deductions'] as $line) {
            PayslipLine::create([
                'payslip_id'  => $payslip->id,
                'category'    => 'deduction',
                'code'        => $line['code'],
                'description' => $line['description'],
                'amount'      => $line['amount'],
                'is_taxable'  => $line['is_taxable'] ?? false,
                'sort_order'  => $sort++,
            ]);
        }

        // ── 7. Verification output ─────────────────────────────────────────────
        $holidayPay = collect($result['earnings'])
            ->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        $this->command->newLine();
        $this->command->line('┌─────────────────────────────────────────────────────────────────┐');
        $this->command->line('│  Cross-Midnight Payslip Seeder — Verification Table             │');
        $this->command->line('├─────────────────────────────────────────────────────────────────┤');
        $this->command->line("│  Employee       : {$employee->first_name} {$employee->last_name} ({$employee->email})");
        $this->command->line("│  Period         : 2026-04-01 → 2026-04-15");
        $this->command->line("│  Monthly Salary : ₱30,000.00  |  Daily Rate: ₱1,363.64");
        $this->command->line('├─────────────────────────────────────────────────────────────────┤');
        $this->command->line('│  HOLIDAY_PAY breakdown (expected → actual)                      │');
        $this->command->line('│                                                                  │');
        $this->command->line('│  Apr 01→02  6h post-midnight  Maundy Thu (spl)  +  ₱   306.82  │');
        $this->command->line('│  Apr 02→03  2h pre-midnight   Maundy Thu (spl)  +  ₱   102.27  │');
        $this->command->line('│  Apr 02→03  6h post-midnight  Good Fri  (reg)   +  ₱ 1,022.73  │');
        $this->command->line('│  Apr 03     guarantee         Good Fri  (reg)   +  ₱ 1,363.64  │');
        $this->command->line('│  Apr 08→09  6h post-midnight  Araw ng K (reg)   +  ₱ 1,022.73  │');
        $this->command->line('│  Apr 09     guarantee         Araw ng K (reg)   +  ₱ 1,363.64  │');
        $this->command->line('│                                              ─────────────────   │');
        $this->command->line('│  Expected HOLIDAY_PAY total               ≈  ₱ 5,181.83        │');
        $this->command->line("│  Actual   HOLIDAY_PAY total               =  ₱ " . number_format($holidayPay, 2) . str_pad('', max(0, 10 - strlen(number_format($holidayPay, 2)))) . '        │');
        $this->command->line('├─────────────────────────────────────────────────────────────────┤');
        $this->command->line("│  basic_pay       : ₱" . number_format($s['basic_pay'], 2));
        $this->command->line("│  gross_pay       : ₱" . number_format($s['gross_pay'], 2));
        $this->command->line("│  total_deductions: ₱" . number_format($s['total_deductions'], 2));
        $this->command->line("│  net_pay         : ₱" . number_format($s['net_pay'], 2));
        $this->command->line("│  days_worked     : {$s['days_worked']}  (expected: 9.0)");
        $this->command->line("│  nd_minutes      : {$s['nd_minutes']}  (cross-midnight ND)");
        $this->command->line('├─────────────────────────────────────────────────────────────────┤');
        $this->command->line('│  ✔ Payslip released. Log in to verify in the Payslips page.    │');
        $this->command->line('│  Email: nightdemo@demo.com  |  Password: password               │');
        $this->command->line('└─────────────────────────────────────────────────────────────────┘');
        $this->command->newLine();

        // Flag mismatch
        if (abs($holidayPay - 5181.83) > 1.00) {
            $this->command->error("⚠  HOLIDAY_PAY mismatch! Expected ≈ ₱5,181.83, got ₱" . number_format($holidayPay, 2));
        } else {
            $this->command->info('✔  HOLIDAY_PAY within ₱1.00 tolerance of ₱5,181.83 — looks correct.');
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function seedHolidays(): void
    {
        $holidays = [
            ['date' => '2026-04-02', 'name' => 'Maundy Thursday',     'type' => 'special'],
            ['date' => '2026-04-03', 'name' => 'Good Friday',          'type' => 'regular'],
            ['date' => '2026-04-04', 'name' => 'Black Saturday',       'type' => 'special'],
            ['date' => '2026-04-09', 'name' => 'Araw ng Kagitingan',   'type' => 'regular'],
        ];
        foreach ($holidays as $h) {
            Holiday::updateOrCreate(['date' => $h['date']], $h);
        }
    }

    private function seedEmployee(): User
    {
        $employee = User::updateOrCreate(
            ['email' => 'nightdemo@demo.com'],
            [
                'first_name'           => 'Night',
                'last_name'            => 'Demo',
                'password'             => Hash::make('password'),
                'monthly_salary'       => 30_000.00,
                'must_change_password' => false,
            ]
        );

        $role = Role::where('slug', 'employee')->first();
        if ($role) {
            $employee->roles()->syncWithoutDetaching([$role->id]);
        }

        Schedule::updateOrCreate(
            ['user_id' => $employee->id],
            ['work_days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'shift_start' => '22:00', 'shift_end' => '06:00']
        );

        return $employee->fresh(['schedule', 'roles']);
    }

    private function disableGovernmentDeductions(User $employee): void
    {
        // Explicitly disable all government deductions for this QA employee so that
        // the payslip shows a realistic net_pay without confusing auto-deduction values.
        $codes = ['SSS', 'PHILHEALTH', 'PAGIBIG', 'WITHHOLDING_TAX'];
        foreach ($codes as $code) {
            DB::table('user_government_deduction_settings')->updateOrInsert(
                ['user_id' => $employee->id, 'code' => $code],
                ['is_enabled' => false, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }

    private function seedTimeLogs(User $employee): void
    {
        // All clock_in / clock_out stored in UTC.
        // Schedule is 22:00–06:00 (night shift). All logs are full 8h shifts.
        //   Manila 22:00 = UTC 14:00 (same calendar date as the shift-start)
        //   Manila 06:00 next day = UTC 22:00 (same calendar date as the shift-start)
        //
        // Example: log date = 2026-04-01
        //   clock_in  = '2026-04-01 14:00:00' UTC  →  Manila Apr 01 22:00
        //   clock_out = '2026-04-01 22:00:00' UTC  →  Manila Apr 02 06:00
        //   Service detects cross-midnight (Apr 01 22:00 ≠ Apr 02 06:00 in Manila)

        $logs = [
            // ─── Cross-midnight scenarios ──────────────────────────────────────
            [
                // Scenario A: Normal Wed → Maundy Thursday (special)
                // Manila Apr 01 22:00 → Apr 02 06:00  (2h pre-midnight + 6h post-midnight)
                'date'      => '2026-04-01',
                'clock_in'  => '2026-04-01 14:00:00',  // Manila Apr 01 22:00
                'clock_out' => '2026-04-01 22:00:00',  // Manila Apr 02 06:00
                'label'     => 'Apr 01 → Apr 02 (Normal → Maundy Thu/special, 6h post)',
            ],
            [
                // Scenario B: Maundy Thursday (special) → Good Friday (regular)
                // Manila Apr 02 22:00 → Apr 03 06:00  (2h pre on special + 6h post on regular)
                'date'      => '2026-04-02',
                'clock_in'  => '2026-04-02 14:00:00',  // Manila Apr 02 22:00
                'clock_out' => '2026-04-02 22:00:00',  // Manila Apr 03 06:00
                'label'     => 'Apr 02 → Apr 03 (Maundy Thu/special → Good Fri/regular)',
            ],
            [
                // Scenario C: Normal Wed → Normal Thu (baseline — no holiday premium)
                // Manila Apr 07 22:00 → Apr 08 06:00  (8h net, fully inside ND window)
                'date'      => '2026-04-07',
                'clock_in'  => '2026-04-07 14:00:00',  // Manila Apr 07 22:00
                'clock_out' => '2026-04-07 22:00:00',  // Manila Apr 08 06:00
                'label'     => 'Apr 07 → Apr 08 (Normal → Normal, ND baseline)',
            ],
            [
                // Scenario D: Normal Wed → Araw ng Kagitingan (regular)
                // Manila Apr 08 22:00 → Apr 09 06:00  (2h pre + 6h post on regular holiday)
                'date'      => '2026-04-08',
                'clock_in'  => '2026-04-08 14:00:00',  // Manila Apr 08 22:00
                'clock_out' => '2026-04-08 22:00:00',  // Manila Apr 09 06:00
                'label'     => 'Apr 08 → Apr 09 (Normal → Araw ng Kagitingan/regular, 6h post)',
            ],

            // ─── Normal night shifts (full 8h, no holiday) ────────────────────
            [
                'date'      => '2026-04-06',
                'clock_in'  => '2026-04-06 14:00:00',  // Manila Apr 06 22:00
                'clock_out' => '2026-04-06 22:00:00',  // Manila Apr 07 06:00
                'label'     => 'Apr 06 → Apr 07 — normal night shift (Mon)',
            ],
            [
                'date'      => '2026-04-10',
                'clock_in'  => '2026-04-10 14:00:00',  // Manila Apr 10 22:00
                'clock_out' => '2026-04-10 22:00:00',  // Manila Apr 11 06:00
                'label'     => 'Apr 10 → Apr 11 — normal night shift (Fri)',
            ],
            [
                'date'      => '2026-04-13',
                'clock_in'  => '2026-04-13 14:00:00',
                'clock_out' => '2026-04-13 22:00:00',
                'label'     => 'Apr 13 → Apr 14 — normal night shift (Mon)',
            ],
            [
                'date'      => '2026-04-14',
                'clock_in'  => '2026-04-14 14:00:00',
                'clock_out' => '2026-04-14 22:00:00',
                'label'     => 'Apr 14 → Apr 15 — normal night shift (Tue)',
            ],
            [
                'date'      => '2026-04-15',
                'clock_in'  => '2026-04-15 14:00:00',
                'clock_out' => '2026-04-15 22:00:00',
                'label'     => 'Apr 15 → Apr 16 — normal night shift (Wed)',
            ],
        ];

        foreach ($logs as $entry) {
            TimeLog::updateOrCreate(
                ['user_id' => $employee->id, 'date' => $entry['date']],
                [
                    'clock_in'         => $entry['clock_in'],
                    'clock_out'        => $entry['clock_out'],
                    'overtime_minutes' => 0,
                    'status'           => 'clocked_out',
                ]
            );
        }
    }
}
