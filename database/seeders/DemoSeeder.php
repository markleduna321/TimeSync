<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * DemoSeeder — Realistic demonstration data for client presentations.
 *
 * Creates:
 *  - 1 Account  (SkyBridge Solutions)
 *  - 2 Departments (Operations, Human Resources)
 *  - 1 Admin user  + 2 Employees
 *  - Schedules, government deduction settings
 *  - Leave types (VL, SL, EL) + credits for 2025 & 2026
 *  - Time logs from Jan 2025 → today  (present / late / absent / half-day leave)
 *  - Approved leave applications  (VL, SL)
 *  - Monthly payslips (1st & 2nd cutoff) from Jan 2025 → month before today
 *
 * Safe to re-run — uses updateOrCreate / insertOrIgnore patterns.
 */
class DemoSeeder extends Seeder
{
    // ── Salary config ─────────────────────────────────────────────────────────
    private const SALARY_MARIA = 32_000.00;
    private const SALARY_JOSE  = 28_500.00;

    // ── Schedule ──────────────────────────────────────────────────────────────
    private const WORK_DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    private const SHIFT_START = '08:00:00';
    private const SHIFT_END   = '17:00:00';

    // ── Government deduction codes ────────────────────────────────────────────
    private const GOV_CODES = ['SSS', 'PHILHEALTH', 'PAGIBIG', 'WITHHOLDING_TAX'];

    public function run(): void
    {
        // ── 1. Account ─────────────────────────────────────────────────────────
        $account = DB::table('accounts')->updateOrInsert(
            ['code' => 'SKYBRIDGE'],
            ['name' => 'SkyBridge Solutions', 'code' => 'SKYBRIDGE', 'description' => 'Demo client account', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        );
        $accountId = DB::table('accounts')->where('code', 'SKYBRIDGE')->value('id');

        // ── 2. Departments ─────────────────────────────────────────────────────
        foreach ([
            ['code' => 'OPS', 'name' => 'Operations',       'description' => 'Core operations team'],
            ['code' => 'HR',  'name' => 'Human Resources',   'description' => 'HR and admin team'],
        ] as $dept) {
            DB::table('departments')->updateOrInsert(
                ['code' => $dept['code']],
                array_merge($dept, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]),
            );
        }
        $opsDeptId = DB::table('departments')->where('code', 'OPS')->value('id');
        $hrDeptId  = DB::table('departments')->where('code', 'HR')->value('id');

        // ── 3. Roles ──────────────────────────────────────────────────────────
        $adminRole    = Role::where('slug', 'admin')->first();
        $employeeRole = Role::where('slug', 'employee')->first();

        // ── 4. Users ──────────────────────────────────────────────────────────
        $admin = User::updateOrCreate(
            ['email' => 'demo.admin@skybridge.com'],
            [
                'first_name'           => 'Alex',
                'last_name'            => 'Cruz',
                'password'             => Hash::make('DemoAdmin123'),
                'monthly_salary'       => 45_000.00,
                'account_id'           => $accountId,
                'department_id'        => $hrDeptId,
                'must_change_password' => false,
            ],
        );

        $maria = User::updateOrCreate(
            ['email' => 'maria.santos@skybridge.com'],
            [
                'first_name'           => 'Maria',
                'middle_name'          => 'L.',
                'last_name'            => 'Santos',
                'password'             => Hash::make('Employee123'),
                'monthly_salary'       => self::SALARY_MARIA,
                'account_id'           => $accountId,
                'department_id'        => $opsDeptId,
                'must_change_password' => false,
            ],
        );

        $jose = User::updateOrCreate(
            ['email' => 'jose.reyes@skybridge.com'],
            [
                'first_name'           => 'Jose',
                'middle_name'          => 'M.',
                'last_name'            => 'Reyes',
                'password'             => Hash::make('Employee123'),
                'monthly_salary'       => self::SALARY_JOSE,
                'account_id'           => $accountId,
                'department_id'        => $opsDeptId,
                'must_change_password' => false,
            ],
        );

        // Assign roles
        if ($adminRole)    $admin->roles()->syncWithoutDetaching([$adminRole->id]);
        if ($employeeRole) $maria->roles()->syncWithoutDetaching([$employeeRole->id]);
        if ($employeeRole) $jose->roles()->syncWithoutDetaching([$employeeRole->id]);

        // ── 5. Schedules ──────────────────────────────────────────────────────
        foreach ([$admin, $maria, $jose] as $u) {
            DB::table('schedules')->updateOrInsert(
                ['user_id' => $u->id],
                [
                    'work_days'   => json_encode(self::WORK_DAYS),
                    'shift_start' => self::SHIFT_START,
                    'shift_end'   => self::SHIFT_END,
                    'updated_at'  => now(),
                    'created_at'  => now(),
                ],
            );
        }

        // ── 6. Government deduction settings (employees) ──────────────────────
        foreach ([$maria, $jose] as $u) {
            foreach (self::GOV_CODES as $code) {
                DB::table('user_government_deduction_settings')->updateOrInsert(
                    ['user_id' => $u->id, 'code' => $code],
                    ['is_enabled' => true, 'created_at' => now(), 'updated_at' => now()],
                );
            }
        }

        // ── 7. Leave types ────────────────────────────────────────────────────
        $leaveTypes = [
            ['code' => 'VL', 'name' => 'Vacation Leave',   'color' => '#6366f1', 'is_paid' => true,  'min_advance_days' => 5, 'max_consecutive_days' => 5],
            ['code' => 'SL', 'name' => 'Sick Leave',        'color' => '#f59e0b', 'is_paid' => true,  'min_advance_days' => 0, 'max_consecutive_days' => null],
            ['code' => 'EL', 'name' => 'Emergency Leave',   'color' => '#ef4444', 'is_paid' => false, 'min_advance_days' => 0, 'max_consecutive_days' => 3],
        ];
        foreach ($leaveTypes as $lt) {
            DB::table('leave_types')->updateOrInsert(
                ['code' => $lt['code']],
                array_merge($lt, ['is_active' => true, 'requires_proof_above_days' => $lt['code'] === 'SL' ? 2 : null, 'is_monetizable' => $lt['code'] === 'VL', 'created_at' => now(), 'updated_at' => now()]),
            );
        }
        $vlId = DB::table('leave_types')->where('code', 'VL')->value('id');
        $slId = DB::table('leave_types')->where('code', 'SL')->value('id');
        $elId = DB::table('leave_types')->where('code', 'EL')->value('id');

        // ── 8. Leave credits (2025 & 2026) ────────────────────────────────────
        foreach ([$maria, $jose] as $u) {
            foreach ([2025, 2026] as $year) {
                foreach ([
                    [$vlId, 15.00],
                    [$slId, 15.00],
                    [$elId,  3.00],
                ] as [$ltId, $credits]) {
                    DB::table('leave_credits')->updateOrInsert(
                        ['user_id' => $u->id, 'leave_type_id' => $ltId, 'year' => $year],
                        ['total_credits' => $credits, 'used_credits' => 0, 'carried_over' => 0, 'created_at' => now(), 'updated_at' => now()],
                    );
                }
            }
        }

        // ── 9. Time logs + Leave applications ────────────────────────────────
        // We generate logs from Jan 1 2025 → yesterday.
        // Attendance patterns per employee:
        //   Maria — hardworking; ~3 absences/month, late 2-3x/month, 1 VL/SL per quarter
        //   Jose  — average;    ~5 absences/month, late 4-5x/month, 1 VL/SL per quarter

        $start = Carbon::create(2025, 1, 1);
        $end   = Carbon::yesterday();

        // Pre-defined leave windows (start_date → end_date) for narrative variety
        $leaveWindows = [
            // Maria
            ['user' => 'maria', 'type' => $vlId, 'from' => '2025-04-14', 'to' => '2025-04-16'], // 3-day vacation
            ['user' => 'maria', 'type' => $slId, 'from' => '2025-07-02', 'to' => '2025-07-02'], // 1-day sick
            ['user' => 'maria', 'type' => $vlId, 'from' => '2025-11-03', 'to' => '2025-11-05'], // 3-day vacation
            ['user' => 'maria', 'type' => $slId, 'from' => '2026-01-20', 'to' => '2026-01-21'], // 2-day sick
            ['user' => 'maria', 'type' => $vlId, 'from' => '2026-04-07', 'to' => '2026-04-08'], // vacation
            // Jose
            ['user' => 'jose',  'type' => $vlId, 'from' => '2025-03-17', 'to' => '2025-03-18'],
            ['user' => 'jose',  'type' => $slId, 'from' => '2025-06-09', 'to' => '2025-06-10'],
            ['user' => 'jose',  'type' => $slId, 'from' => '2025-09-22', 'to' => '2025-09-22'],
            ['user' => 'jose',  'type' => $vlId, 'from' => '2025-12-15', 'to' => '2025-12-17'],
            ['user' => 'jose',  'type' => $slId, 'from' => '2026-02-10', 'to' => '2026-02-11'],
            ['user' => 'jose',  'type' => $vlId, 'from' => '2026-05-04', 'to' => '2026-05-05'],
        ];

        // Build lookup sets of leave dates per user
        $leaveDates = ['maria' => [], 'jose' => []];
        foreach ($leaveWindows as $lw) {
            $period = CarbonPeriod::create($lw['from'], $lw['to']);
            foreach ($period as $d) {
                if (! $d->isWeekend()) {
                    $leaveDates[$lw['user']][$d->toDateString()] = [
                        'leave_type_id' => $lw['type'],
                    ];
                }
            }
        }

        // Create leave applications for each window
        $reviewedAt = Carbon::create(2025, 1, 1);
        foreach ($leaveWindows as $lw) {
            $user      = $lw['user'] === 'maria' ? $maria : $jose;
            $fromDate  = Carbon::parse($lw['from']);
            $toDate    = Carbon::parse($lw['to']);
            // Count business days
            $daysCount = 0;
            foreach (CarbonPeriod::create($fromDate, $toDate) as $d) {
                if (! $d->isWeekend()) $daysCount++;
            }
            if ($daysCount === 0) continue;

            $appExists = DB::table('leave_applications')
                ->where('user_id', $user->id)
                ->where('start_date', $lw['from'])
                ->where('leave_type_id', $lw['type'])
                ->exists();

            if (! $appExists) {
                $appId = DB::table('leave_applications')->insertGetId([
                    'user_id'        => $user->id,
                    'leave_type_id'  => $lw['type'],
                    'start_date'     => $lw['from'],
                    'end_date'       => $lw['to'],
                    'days_requested' => $daysCount,
                    'half_day'       => false,
                    'reason'         => $this->leaveReason($lw['type'], $vlId),
                    'status'         => 'approved',
                    'reviewed_by'    => $admin->id,
                    'reviewed_at'    => $fromDate->copy()->subDay()->toDateTimeString(),
                    'created_at'     => $fromDate->copy()->subDays(3)->toDateTimeString(),
                    'updated_at'     => $fromDate->copy()->subDay()->toDateTimeString(),
                ]);

                // Deduct leave credits
                DB::table('leave_credits')
                    ->where('user_id', $user->id)
                    ->where('leave_type_id', $lw['type'])
                    ->where('year', $fromDate->year)
                    ->increment('used_credits', $daysCount);
            }
        }

        // ── Generate daily time logs ──────────────────────────────────────────
        $employees = [
            'maria' => [
                'model'         => $maria,
                'absenceRate'   => 0.08, // ~8% of workdays absent
                'lateRate'      => 0.12, // ~12% of worked days late
                'lateMaxMins'   => 45,
            ],
            'jose' => [
                'model'         => $jose,
                'absenceRate'   => 0.13,
                'lateRate'      => 0.18,
                'lateMaxMins'   => 60,
            ],
        ];

        // Use a seeded random so results are deterministic
        mt_srand(42);

        $period = CarbonPeriod::create($start, $end);

        foreach ($period as $date) {
            if ($date->isWeekend()) continue;

            $dateStr = $date->toDateString();

            foreach ($employees as $key => $config) {
                /** @var User $user */
                $user = $config['model'];

                // Skip if log already exists
                $exists = DB::table('time_logs')
                    ->where('user_id', $user->id)
                    ->where('date', $dateStr)
                    ->exists();
                if ($exists) continue;

                // On leave?
                if (isset($leaveDates[$key][$dateStr])) {
                    // No time log — leave = absent from attendance perspective
                    continue;
                }

                // Absent (random)?
                if ((mt_rand(0, 999) / 1000) < $config['absenceRate']) {
                    // No time log = absent
                    continue;
                }

                // Build clock times
                $shiftStart = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} 08:00:00");
                $shiftEnd   = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} 17:00:00");

                // Late?
                $lateMins = 0;
                if ((mt_rand(0, 999) / 1000) < $config['lateRate']) {
                    $lateMins = mt_rand(5, $config['lateMaxMins']);
                }

                $clockIn   = $shiftStart->copy()->addMinutes($lateMins);
                $lunchStart = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} 12:00:00");
                $lunchEnd   = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} 13:00:00");
                // Early clock-out some days (~5%)
                $earlyMins = (mt_rand(0, 999) / 1000) < 0.05 ? mt_rand(10, 30) : 0;
                $clockOut  = $shiftEnd->copy()->subMinutes($earlyMins);

                DB::table('time_logs')->insertOrIgnore([
                    'user_id'     => $user->id,
                    'date'        => $dateStr,
                    'clock_in'    => $clockIn->toDateTimeString(),
                    'clock_out'   => $clockOut->toDateTimeString(),
                    'lunch_start' => $lunchStart->toDateTimeString(),
                    'lunch_end'   => $lunchEnd->toDateTimeString(),
                    'breaks'      => null,
                    'status'      => 'clocked_out',
                    'created_at'  => $clockIn->toDateTimeString(),
                    'updated_at'  => $clockOut->toDateTimeString(),
                ]);
            }
        }

        // ── 10. Payslips ──────────────────────────────────────────────────────
        // Generate 1st & 2nd cutoff payslips from Jan 2025 → last COMPLETED month.
        $payStart      = Carbon::create(2025, 1, 1);
        $lastMonth     = Carbon::now()->subMonth()->endOfMonth();

        foreach ([$maria, $jose] as $employee) {
            $salary    = $employee->monthly_salary;
            $dailyRate = $salary / 22; // standard 22 working days/month

            $cursor = $payStart->copy()->startOfMonth();

            while ($cursor->lte($lastMonth)) {
                $year  = $cursor->year;
                $month = $cursor->month;

                $this->createPayslipPair($employee, $admin, $salary, $dailyRate, $year, $month, $leaveDates, $slId, $vlId, $elId);

                $cursor->addMonth();
            }
        }

        $this->command->info('DemoSeeder complete — 2 employees, attendance from Jan 2025, payslips generated.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function leaveReason(int $typeId, int $vlId): string
    {
        return $typeId === $vlId
            ? 'Family vacation leave request.'
            : 'Not feeling well — requesting sick leave.';
    }

    /**
     * Create the 1st-cutoff (1–15) and 2nd-cutoff (16–EOM) payslips for one employee/month.
     */
    private function createPayslipPair(
        User   $employee,
        User   $admin,
        float  $salary,
        float  $dailyRate,
        int    $year,
        int    $month,
               $leaveDates,
        int    $slId,
        int    $vlId,
        int    $elId,
    ): void {
        $cutoffs = [
            'first'  => [Carbon::create($year, $month, 1),  Carbon::create($year, $month, 15)],
            'second' => [Carbon::create($year, $month, 16), Carbon::create($year, $month)->endOfMonth()],
        ];

        // Determine user key for leave lookup
        $userKey = $employee->email === 'maria.santos@skybridge.com' ? 'maria' : 'jose';

        foreach ($cutoffs as $cutoffType => [$periodStart, $periodEnd]) {
            // Skip if already exists
            $exists = DB::table('payslips')
                ->where('user_id', $employee->id)
                ->where('period_start', $periodStart->toDateString())
                ->where('period_end', $periodEnd->toDateString())
                ->exists();
            if ($exists) continue;

            // Count scheduled & worked days in this cutoff window
            $scheduled  = 0;
            $worked     = 0;
            $absent     = 0;
            $lateMins   = 0;
            $leaveDays  = 0;
            $paidLeave  = 0;

            $window = CarbonPeriod::create($periodStart, $periodEnd);
            foreach ($window as $d) {
                if ($d->isWeekend()) continue;
                $scheduled++;
                $ds = $d->toDateString();

                // Check time log
                $log = DB::table('time_logs')
                    ->where('user_id', $employee->id)
                    ->where('date', $ds)
                    ->first();

                if ($log) {
                    $worked++;
                    // Compute late minutes (abs guards against Carbon sign-convention differences)
                    $clockIn    = Carbon::parse($log->clock_in);
                    $shiftStart = Carbon::createFromFormat('Y-m-d H:i:s', "{$ds} 08:00:00");
                    if ($clockIn->gt($shiftStart)) {
                        $lateMins += (int) abs($clockIn->diffInMinutes($shiftStart));
                    }
                } elseif (isset($leaveDates[$userKey][$ds])) {
                    $leaveDays++;
                    $ltId = $leaveDates[$userKey][$ds]['leave_type_id'];
                    if ($ltId === $slId || $ltId === $vlId) {
                        $paidLeave++;
                    }
                } else {
                    $absent++;
                }
            }

            // Salary computation (simplified semi-monthly basis)
            $semiMonthlySalary = $salary / 2;
            $workableInCutoff  = max($scheduled, 1);

            // Deduct absences (unpaid)
            $absentDeduction = $absent * $dailyRate;

            // Late deduction (per minute)
            $minuteRate      = $dailyRate / 480; // 8h × 60min
            $lateDeduction   = round($lateMins * $minuteRate, 2);

            $basicPay    = round($semiMonthlySalary - $absentDeduction - $lateDeduction, 2);
            $basicPay    = max($basicPay, 0);

            // Government deductions (2nd cutoff only, approximate PH brackets)
            $sssAmt       = 0;
            $philHealthAmt = 0;
            $pagIbigAmt   = 0;
            $withholdingAmt = 0;

            if ($cutoffType === 'second') {
                $sssAmt        = $this->computeSSS($salary);
                $philHealthAmt = round($salary * 0.025, 2);     // 2.5% employee share
                $pagIbigAmt    = min(round($salary * 0.02, 2), 200); // 2% capped ₱200 (2025 MFS cap ₱10,000)
                $withholdingAmt = $this->computeWithholding($salary);
            }

            $totalGovDeductions = $sssAmt + $philHealthAmt + $pagIbigAmt + $withholdingAmt;
            $grossPay           = $basicPay;
            $totalDeductions    = round($totalGovDeductions, 2);
            $netPay             = round($grossPay - $totalDeductions, 2);

            $payslipId = DB::table('payslips')->insertGetId([
                'user_id'              => $employee->id,
                'period_start'         => $periodStart->toDateString(),
                'period_end'           => $periodEnd->toDateString(),
                'pay_date'             => $periodEnd->copy()->addDays(5)->toDateString(),
                'monthly_salary'       => $salary,
                'daily_rate'           => round($dailyRate, 2),
                'basic_pay'            => $basicPay,
                'gross_pay'            => $grossPay,
                'total_deductions'     => $totalDeductions,
                'net_pay'              => $netPay,
                'days_scheduled'       => $scheduled,
                'days_worked'          => $worked + $paidLeave,
                'days_absent'          => $absent,
                'late_minutes'         => max(0, (int) round($lateMins)),
                'undertime_minutes'    => 0,
                'over_break_minutes'   => 0,
                'ot_minutes'           => 0,
                'rest_day_minutes'     => 0,
                'rest_day_ot_minutes'  => 0,
                'taxable_income'       => $grossPay,
                'status'               => 'released',
                'cutoff_type'          => $cutoffType,
                'generated_by'         => $admin->id,
                'released_at'          => $periodEnd->copy()->addDays(5)->toDateTimeString(),
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);

            // ── Payslip lines ─────────────────────────────────────────────────
            $lines = [];
            $sort  = 1;

            // Earnings
            $lines[] = ['payslip_id' => $payslipId, 'category' => 'earning', 'sort_order' => $sort++, 'code' => 'BASIC', 'description' => 'Basic Pay',   'amount' => $semiMonthlySalary,  'is_taxable' => true,  'created_at' => now(), 'updated_at' => now()];

            if ($absentDeduction > 0) {
                $lines[] = ['payslip_id' => $payslipId, 'category' => 'deduction', 'sort_order' => $sort++, 'code' => 'ABSENT', 'description' => 'Absent Deduction',  'amount' => $absentDeduction, 'is_taxable' => false, 'created_at' => now(), 'updated_at' => now()];
            }
            if ($lateDeduction > 0) {
                $lines[] = ['payslip_id' => $payslipId, 'category' => 'deduction', 'sort_order' => $sort++, 'code' => 'LATE', 'description' => 'Late/Undertime Deduction', 'amount' => $lateDeduction, 'is_taxable' => false, 'created_at' => now(), 'updated_at' => now()];
            }

            // Government deductions (2nd cutoff)
            if ($sssAmt > 0) {
                $lines[] = ['payslip_id' => $payslipId, 'category' => 'deduction', 'sort_order' => $sort++, 'code' => 'SSS',          'description' => 'SSS Contribution',          'amount' => $sssAmt,         'is_taxable' => false, 'created_at' => now(), 'updated_at' => now()];
            }
            if ($philHealthAmt > 0) {
                $lines[] = ['payslip_id' => $payslipId, 'category' => 'deduction', 'sort_order' => $sort++, 'code' => 'PHILHEALTH',    'description' => 'PhilHealth Contribution',    'amount' => $philHealthAmt,  'is_taxable' => false, 'created_at' => now(), 'updated_at' => now()];
            }
            if ($pagIbigAmt > 0) {
                $lines[] = ['payslip_id' => $payslipId, 'category' => 'deduction', 'sort_order' => $sort++, 'code' => 'PAGIBIG',       'description' => 'Pag-IBIG Contribution',      'amount' => $pagIbigAmt,     'is_taxable' => false, 'created_at' => now(), 'updated_at' => now()];
            }
            if ($withholdingAmt > 0) {
                $lines[] = ['payslip_id' => $payslipId, 'category' => 'deduction', 'sort_order' => $sort++, 'code' => 'WHT',           'description' => 'Withholding Tax',             'amount' => $withholdingAmt, 'is_taxable' => false, 'created_at' => now(), 'updated_at' => now()];
            }

            DB::table('payslip_lines')->insert($lines);
        }
    }

    /**
     * Simplified SSS contribution table (employee share, 2024 rates).
     * Ranges: ≤3,250 → ₱135; every ₱500 band adds proportionally; capped at ₱900 (≥20,250).
     */
    private function computeSSS(float $salary): float
    {
        if ($salary <= 3_250)  return 135.00;
        if ($salary <= 3_750)  return 157.50;
        if ($salary <= 4_250)  return 180.00;
        if ($salary <= 4_750)  return 202.50;
        if ($salary <= 5_250)  return 225.00;
        if ($salary <= 5_750)  return 247.50;
        if ($salary <= 6_250)  return 270.00;
        if ($salary <= 6_750)  return 292.50;
        if ($salary <= 7_250)  return 315.00;
        if ($salary <= 7_750)  return 337.50;
        if ($salary <= 8_250)  return 360.00;
        if ($salary <= 8_750)  return 382.50;
        if ($salary <= 9_250)  return 405.00;
        if ($salary <= 9_750)  return 427.50;
        if ($salary <= 10_250) return 450.00;
        if ($salary <= 10_750) return 472.50;
        if ($salary <= 11_250) return 495.00;
        if ($salary <= 11_750) return 517.50;
        if ($salary <= 12_250) return 540.00;
        if ($salary <= 12_750) return 562.50;
        if ($salary <= 13_250) return 585.00;
        if ($salary <= 13_750) return 607.50;
        if ($salary <= 14_250) return 630.00;
        if ($salary <= 14_750) return 652.50;
        if ($salary <= 15_250) return 675.00;
        if ($salary <= 15_750) return 697.50;
        if ($salary <= 16_250) return 720.00;
        if ($salary <= 16_750) return 742.50;
        if ($salary <= 17_250) return 765.00;
        if ($salary <= 17_750) return 787.50;
        if ($salary <= 18_250) return 810.00;
        if ($salary <= 18_750) return 832.50;
        if ($salary <= 19_250) return 855.00;
        if ($salary <= 19_750) return 877.50;
        return 900.00; // ≥20,000
    }

    /**
     * Simplified BIR withholding tax (monthly bracket, then halved for semi-monthly).
     * 2024 TRAIN law rates.
     */
    private function computeWithholding(float $monthlySalary): float
    {
        // Monthly amounts (employee share; semi-monthly deduction = annual / 24)
        // Using simplified flat-rate approximation per TRAIN bracket
        if ($monthlySalary <= 20_833)  return 0.00;
        if ($monthlySalary <= 33_333)  return round(($monthlySalary - 20_833) * 0.20 / 2, 2);
        if ($monthlySalary <= 83_333)  return round((2_500 + ($monthlySalary - 33_333) * 0.25) / 2, 2);
        if ($monthlySalary <= 133_333) return round((15_000 + ($monthlySalary - 83_333) * 0.30) / 2, 2);
        if ($monthlySalary <= 333_333) return round((30_000 + ($monthlySalary - 133_333) * 0.32) / 2, 2);
        return round((94_000 + ($monthlySalary - 333_333) * 0.35) / 2, 2);
    }
}
