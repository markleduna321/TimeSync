<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\AllowanceType;
use App\Models\AttendanceCorrection;
use App\Models\Department;
use App\Models\DeductionType;
use App\Models\Holiday;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\Role;
use App\Models\Schedule;
use App\Models\Team;
use App\Models\TimeLog;
use App\Models\User;
use App\Models\UserAllowance;
use App\Models\UserDeduction;
use App\Services\PayslipComputationService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    private PayslipComputationService $payroll;
    private User $admin;

    public function __construct(PayslipComputationService $payroll)
    {
        $this->payroll = $payroll;
    }

    public function run(): void
    {
        if (User::where('email', 'LIKE', '%@demo.com')->exists()) {
            $this->command->warn('Demo data already present. Skipping. Truncate demo users to re-seed.');
            return;
        }

        DB::transaction(function () {
            $depts    = $this->seedDepartments();
            $accounts = $this->seedAccounts();
            $this->seedAllowanceTypes();
            $this->seedDeductionTypes();
            $this->seedHolidays();
            $this->admin = $this->ensureAdmin();

            $employees = $this->seedEmployees($depts, $accounts);

            $this->command->info('Generating time logs (Jan–Apr 2026)…');
            foreach ($employees as $emp) {
                $this->generateTimeLogs($emp['user'], $emp['idx']);
            }

            $this->command->info('Generating attendance corrections…');
            foreach ($employees as $emp) {
                $this->generateCorrections($emp['user'], $emp['idx']);
            }

            $this->command->info('Computing and releasing payslips…');
            $periods = [
                [Carbon::create(2026, 1, 1),  Carbon::create(2026, 1, 15)],
                [Carbon::create(2026, 1, 16), Carbon::create(2026, 1, 31)],
                [Carbon::create(2026, 2, 1),  Carbon::create(2026, 2, 15)],
                [Carbon::create(2026, 2, 16), Carbon::create(2026, 2, 28)],
                [Carbon::create(2026, 3, 1),  Carbon::create(2026, 3, 15)],
                [Carbon::create(2026, 3, 16), Carbon::create(2026, 3, 31)],
                [Carbon::create(2026, 4, 1),  Carbon::create(2026, 4, 15)],
                [Carbon::create(2026, 4, 16), Carbon::create(2026, 4, 30)],
            ];
            foreach ($employees as $emp) {
                foreach ($periods as [$start, $end]) {
                    $this->generatePayslip($emp['user'], $start, $end);
                }
            }

            $this->seedTeams($employees);
        });

        $this->command->info('✔ Demo seeded: 10 employees, 4 months of time logs, corrections, and payslips.');
    }

    // ─── REFERENCE DATA ──────────────────────────────────────────────────────

    private function seedDepartments(): array
    {
        $defs = [
            ['name' => 'Engineering',     'code' => 'ENG', 'description' => 'Software development and IT infrastructure'],
            ['name' => 'Human Resources', 'code' => 'HR',  'description' => 'People operations, payroll, and compliance'],
            ['name' => 'Finance',         'code' => 'FIN', 'description' => 'Accounting, budgeting, and financial reporting'],
            ['name' => 'Operations',      'code' => 'OPS', 'description' => 'Business operations and logistics'],
        ];
        $result = [];
        foreach ($defs as $d) {
            $result[$d['code']] = Department::updateOrCreate(['code' => $d['code']], $d);
        }
        return $result;
    }

    private function seedAccounts(): array
    {
        $defs = [
            ['name' => 'Main Office', 'code' => 'MAIN',   'description' => 'Head office payroll account'],
            ['name' => 'Branch',      'code' => 'BRANCH', 'description' => 'Satellite office account'],
        ];
        $result = [];
        foreach ($defs as $d) {
            $result[$d['code']] = Account::updateOrCreate(['code' => $d['code']], $d);
        }
        return $result;
    }

    private function seedAllowanceTypes(): void
    {
        $types = [
            [
                'code' => 'RICE',
                'name' => 'Rice Subsidy',
                'is_taxable' => false,
                'monthly_de_minimis_limit' => 2000.00,
                'description' => 'BIR de minimis rice subsidy up to ₱2,000/month (RR 11-2018)',
                'is_active' => true,
            ],
            [
                'code' => 'TRANSPORT',
                'name' => 'Transport Allowance',
                'is_taxable' => false,
                'monthly_de_minimis_limit' => 2000.00,
                'description' => 'Actual transportation expenses, de minimis up to ₱2,000/month',
                'is_active' => true,
            ],
            [
                'code' => 'MEDICAL',
                'name' => 'Medical/Health Subsidy',
                'is_taxable' => false,
                'monthly_de_minimis_limit' => 1500.00,
                'description' => 'Medical and dental aid, de minimis up to ₱1,500/month',
                'is_active' => true,
            ],
        ];
        foreach ($types as $t) {
            AllowanceType::updateOrCreate(['code' => $t['code']], $t);
        }
    }

    private function seedDeductionTypes(): void
    {
        $types = [
            ['code' => 'SALARY_LOAN',  'name' => 'Salary Loan',   'is_government' => false, 'is_auto_computed' => false, 'is_assignable' => true, 'is_active' => true],
            ['code' => 'CASH_ADVANCE', 'name' => 'Cash Advance',  'is_government' => false, 'is_auto_computed' => false, 'is_assignable' => true, 'is_active' => true],
        ];
        foreach ($types as $t) {
            DeductionType::updateOrCreate(['code' => $t['code']], $t);
        }
    }

    private function seedHolidays(): void
    {
        // Philippine holidays covering Jan–Apr 2026
        $holidays = [
            ['date' => '2026-01-01', 'name' => "New Year's Day",               'type' => 'regular'],
            ['date' => '2026-01-29', 'name' => 'Chinese New Year',             'type' => 'special'],
            ['date' => '2026-02-25', 'name' => 'EDSA People Power Revolution', 'type' => 'special'],
            ['date' => '2026-04-02', 'name' => 'Maundy Thursday',              'type' => 'special'],
            ['date' => '2026-04-03', 'name' => 'Good Friday',                  'type' => 'regular'],
            ['date' => '2026-04-04', 'name' => 'Black Saturday',               'type' => 'special'],
            ['date' => '2026-04-09', 'name' => 'Araw ng Kagitingan',           'type' => 'regular'],
        ];
        foreach ($holidays as $h) {
            Holiday::updateOrCreate(['date' => $h['date']], $h);
        }
    }

    private function ensureAdmin(): User
    {
        $user = User::where('email', 'admin@gmail.com')->first();
        if (!$user) {
            throw new \RuntimeException('Admin user (admin@gmail.com) not found. Run php artisan db:seed first.');
        }
        return $user;
    }

    // ─── EMPLOYEES ────────────────────────────────────────────────────────────

    /**
     * Employee definitions:
     *   idx, first, middle, last, email, salary, dept, account, role, schedule,
     *   allowance codes, deductions [[code, monthly_amount, effective_from]]
     *
     * Schedule keys: 'mf' = Mon–Fri, 'ms' = Mon–Sat
     *
     * Behavior profiles (for time log generation):
     *   0  Ana Santos      – Regular OT 2h on day%10 ∈ {3,8}
     *   1  Jose Reyes      – Late 20 min on day%8===1; absent on day%20===14
     *   2  Maria Cruz      – Perfect attendance
     *   3  Pedro Lim       – Late 35 min on day%6===2; absent on day%18===9; undertime on day%12===7
     *   4  Carlo Tan       – OT 3h on day%9===4; RDOT: works Saturdays when day%3<2
     *   5  Grace Dela Rosa – Late 15 min on day%7===2
     *   6  Ramon Flores    – Mon–Sat schedule; OT 1.5h on day%10===6
     *   7  Jenny Villanueva– Mon–Sat schedule; works Sundays when day%5===0 (RDOT 8h)
     *   8  Mark Torres     – OT 3h on day%12===5
     *   9  Lisa Navarro    – Late 8 min on day%11===3
     */
    private function seedEmployees(array $depts, array $accounts): array
    {
        $defs = [
            [0, 'Ana',   'M', 'Santos',     'ana.santos@demo.com',       45000, 'ENG', 'MAIN', 'employee',  'mf', ['RICE','TRANSPORT'],         []],
            [1, 'Jose',  'P', 'Reyes',      'jose.reyes@demo.com',       52000, 'ENG', 'MAIN', 'employee',  'mf', ['RICE'],                     [['SALARY_LOAN', 1000, '2026-01-01']]],
            [2, 'Maria', 'L', 'Cruz',       'maria.cruz@demo.com',       38000, 'HR',  'MAIN', 'manager',   'mf', ['RICE','TRANSPORT'],         []],
            [3, 'Pedro', 'A', 'Lim',        'pedro.lim@demo.com',        30000, 'HR',  'MAIN', 'employee',  'mf', [],                           [['CASH_ADVANCE', 600, '2026-01-01']]],
            [4, 'Carlo', 'B', 'Tan',        'carlo.tan@demo.com',        55000, 'FIN', 'MAIN', 'employee',  'mf', ['RICE','TRANSPORT'],         []],
            [5, 'Grace', 'D', 'Dela Rosa',  'grace.delarosa@demo.com',   48000, 'FIN', 'MAIN', 'employee',  'mf', ['RICE'],                     []],
            [6, 'Ramon', 'G', 'Flores',     'ramon.flores@demo.com',     35000, 'OPS', 'MAIN', 'employee',  'ms', ['TRANSPORT'],                []],
            [7, 'Jenny', 'V', 'Villanueva', 'jenny.villanueva@demo.com', 32000, 'OPS', 'MAIN', 'employee',  'ms', ['RICE'],                     [['CASH_ADVANCE', 400, '2026-01-01']]],
            [8, 'Mark',  'H', 'Torres',     'mark.torres@demo.com',      60000, 'ENG', 'MAIN', 'admin',     'mf', ['RICE','TRANSPORT','MEDICAL'],[]],
            [9, 'Lisa',  'C', 'Navarro',    'lisa.navarro@demo.com',     42000, 'HR',  'MAIN', 'team_lead', 'mf', ['RICE'],                     []],
        ];

        $scheduleDays = [
            'mf' => ['Mon','Tue','Wed','Thu','Fri'],
            'ms' => ['Mon','Tue','Wed','Thu','Fri','Sat'],
        ];

        $employees = [];

        foreach ($defs as [$idx, $first, $mid, $last, $email, $salary, $deptCode, $accCode, $roleSlug, $schedKey, $allowanceCodes, $deductionDefs]) {

            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'first_name'     => $first,
                    'middle_name'    => $mid,
                    'last_name'      => $last,
                    'password'       => Hash::make('password'),
                    'monthly_salary' => $salary,
                    'department_id'  => $depts[$deptCode]->id,
                    'account_id'     => $accounts[$accCode]->id,
                ]
            );

            $role = Role::where('slug', $roleSlug)->first();
            if ($role) {
                $user->roles()->syncWithoutDetaching([$role->id]);
            }

            Schedule::updateOrCreate(
                ['user_id' => $user->id],
                ['work_days' => $scheduleDays[$schedKey], 'shift_start' => '08:00', 'shift_end' => '17:00']
            );

            foreach ($allowanceCodes as $code) {
                $atype = AllowanceType::where('code', $code)->first();
                if ($atype) {
                    $monthly = (float)($atype->monthly_de_minimis_limit ?? 1000);
                    UserAllowance::updateOrCreate(
                        ['user_id' => $user->id, 'allowance_type_id' => $atype->id],
                        ['amount' => $monthly, 'effective_from' => '2025-01-01', 'is_active' => true]
                    );
                }
            }

            foreach ($deductionDefs as [$dcode, $amount, $from]) {
                $dtype = DeductionType::where('code', $dcode)->first();
                if ($dtype) {
                    UserDeduction::updateOrCreate(
                        ['user_id' => $user->id, 'deduction_type_id' => $dtype->id],
                        ['amount' => $amount, 'effective_from' => $from, 'is_active' => true, 'added_by' => $this->admin->id]
                    );
                }
            }

            $employees[] = ['idx' => $idx, 'user' => $user->fresh(['schedule', 'roles'])];
        }

        return $employees;
    }

    // ─── TIME LOGS ────────────────────────────────────────────────────────────

    private function generateTimeLogs(User $emp, int $idx): void
    {
        $schedule = $emp->schedule;
        $holidays = Holiday::whereBetween('date', ['2026-01-01', '2026-04-30'])
            ->get()
            ->keyBy(fn($h) => $h->date->format('Y-m-d'));

        foreach (CarbonPeriod::create('2026-01-01', '2026-04-30') as $date) {
            $ds        = $date->toDateString();
            $dayAbbr   = $date->format('D');
            $isWorkDay = in_array($dayAbbr, $schedule->work_days);
            $holiday   = $holidays[$ds] ?? null;

            $entry = $this->buildTimeLogEntry($idx, $date, $isWorkDay, $holiday);

            if (!$entry) {
                continue;
            }

            TimeLog::updateOrCreate(
                ['user_id' => $emp->id, 'date' => $ds],
                [
                    'clock_in'         => $entry['clock_in'],
                    'clock_out'        => $entry['clock_out'],
                    'lunch_start'      => $entry['lunch_start'],
                    'lunch_end'        => $entry['lunch_end'],
                    'overtime_minutes' => $entry['ot'],
                    'status'           => 'clocked_out',
                ]
            );
        }
    }

    /**
     * Build a single day's time log data, or return null if not worked.
     *
     * Rest-day RDOT logic:
     *   Carlo Tan  (idx 4): works Saturdays — day%3===0 = 8h (rest day only),
     *                                          day%3===1 = 10h (8h rest day + 2h RDOT)
     *   Jenny (idx 7):      works Sundays  — day%5===0 = 8h rest day (+ 1h RDOT via 10h log)
     *
     * Holiday work logic:
     *   Regular holiday: only Maria Cruz (idx 2) works when day%3===0; others off.
     *   Special holiday: Mark Torres (idx 8) always works; Ana (idx 0) works when day%4===0.
     */
    private function buildTimeLogEntry(int $idx, Carbon $date, bool $isWorkDay, ?object $holiday): ?array
    {
        $ds  = $date->toDateString();
        $day = $date->day;

        // Helper to build entry
        $mk = fn(string $in, string $out, int $ot = 0) => [
            'clock_in'   => "$ds $in",
            'clock_out'  => "$ds $out",
            'lunch_start'=> "$ds 12:00:00",
            'lunch_end'  => "$ds 13:00:00",
            'ot'         => $ot,
        ];

        // ── Rest day (not a scheduled work day) ──────────────────────────
        if (!$isWorkDay) {
            if ($holiday) {
                return null; // holiday on rest day — stay home
            }

            $isSat = $date->isSaturday();
            $isSun = $date->isSunday();

            // Carlo Tan (idx 4) — works Saturdays (rest day for Mon–Fri schedule)
            if ($idx === 4 && $isSat) {
                if ($day % 3 === 0) {
                    // Exactly 8h → rest day pay only (no RDOT)
                    return $mk('08:00:00', '17:00:00'); // 9h gross – 1h lunch = 480 min
                }
                if ($day % 3 === 1) {
                    // 10h net → 8h rest day + 2h RDOT
                    return $mk('08:00:00', '19:00:00'); // 11h gross – 1h lunch = 600 min
                }
            }

            // Jenny Villanueva (idx 7) — works some Sundays (Mon–Sat employee, Sun = rest day)
            if ($idx === 7 && $isSun && $day % 5 === 0) {
                // 10h net → 8h rest day + 2h RDOT
                return $mk('08:00:00', '19:00:00');
            }

            return null; // rest day, no work
        }

        // ── Regular holiday on a work day ────────────────────────────────
        if ($holiday && $holiday->type === 'regular') {
            // Maria Cruz (idx 2) worked this holiday
            if ($idx === 2 && $day % 3 === 0) {
                return $mk('08:00:00', '17:00:00');
            }
            // Everyone else: off (service auto-pays holiday pay)
            return null;
        }

        // ── Special holiday on a work day ────────────────────────────────
        if ($holiday && $holiday->type === 'special') {
            // Mark Torres always works special holidays
            if ($idx === 8) {
                return $mk('08:00:00', '17:00:00');
            }
            // Ana Santos works some
            if ($idx === 0 && $day % 4 === 0) {
                return $mk('08:00:00', '17:00:00');
            }
            // Others stay home on special holidays
            return null;
        }

        // ── Normal work day — apply per-employee profile ─────────────────
        return match ($idx) {
            // Ana Santos — OT 2h on certain days
            0 => in_array($day % 10, [3, 8])
                ? $mk('08:00:00', '19:00:00', 120)
                : $mk('08:00:00', '17:00:00'),

            // Jose Reyes — absent / late
            1 => ($day % 20 === 14)
                ? null
                : (($day % 8 === 1) ? $mk('08:20:00', '17:00:00') : $mk('08:00:00', '17:00:00')),

            // Maria Cruz — perfect
            2 => $mk('08:00:00', '17:00:00'),

            // Pedro Lim — absent / late / undertime
            3 => ($day % 18 === 9)
                ? null
                : (($day % 12 === 7)
                    ? $mk('08:00:00', '16:15:00')          // 45 min undertime
                    : (($day % 6 === 2)
                        ? $mk('08:35:00', '17:00:00')      // 35 min late
                        : $mk('08:00:00', '17:00:00'))),

            // Carlo Tan — OT 3h on work days
            4 => ($day % 9 === 4)
                ? $mk('08:00:00', '20:00:00', 180)
                : $mk('08:00:00', '17:00:00'),

            // Grace Dela Rosa — occasional late
            5 => ($day % 7 === 2)
                ? $mk('08:15:00', '17:00:00')
                : $mk('08:00:00', '17:00:00'),

            // Ramon Flores — Mon–Sat schedule; light OT some days
            6 => ($day % 10 === 6)
                ? $mk('08:00:00', '18:30:00', 90)
                : $mk('08:00:00', '17:00:00'),

            // Jenny Villanueva — Mon–Sat, regular days
            7 => $mk('08:00:00', '17:00:00'),

            // Mark Torres — OT 3h on some days
            8 => ($day % 12 === 5)
                ? $mk('08:00:00', '20:00:00', 180)
                : $mk('08:00:00', '17:00:00'),

            // Lisa Navarro — slight occasional lateness
            9 => ($day % 11 === 3)
                ? $mk('08:08:00', '17:00:00')
                : $mk('08:00:00', '17:00:00'),

            default => $mk('08:00:00', '17:00:00'),
        };
    }

    // ─── CORRECTIONS ──────────────────────────────────────────────────────────

    /**
     * Realistic mix of:
     *  - Clock corrections (forgot to punch, biometric failure)
     *  - Overtime requests (type = 'overtime')
     * Statuses: approved, rejected, pending
     */
    private function generateCorrections(User $emp, int $idx): void
    {
        // [date, reason, req_clock_in, req_clock_out, status, type, admin_note]
        $byEmployee = [
            0 => [
                ['2026-01-09', 'Forgot to clock in — arrived on time', '07:55', '17:05', 'approved', 'correction', 'Verified against CCTV log.'],
                ['2026-03-12', 'OT request — client demo preparation',  '17:00', '20:00', 'approved', 'overtime',   'Approved. Noted in project tracker.'],
            ],
            1 => [
                ['2026-01-22', 'Biometric error on clock-out',            '08:00', '17:00', 'approved', 'correction', 'System log confirmed.'],
                ['2026-02-10', 'OT request — sprint deadline',            '17:00', '20:00', 'approved', 'overtime',   'Approved by tech lead.'],
                ['2026-03-05', 'Forgot to clock out',                     '08:00', '17:30', 'pending',  'correction', null],
            ],
            2 => [
                ['2026-02-03', 'Clock-in not registered by device',       '08:00', '17:00', 'approved', 'correction', 'Hardware issue confirmed.'],
            ],
            3 => [
                ['2026-01-15', 'Late due to accident on EDSA',            '09:30', '17:00', 'rejected', 'correction', 'No supporting document submitted.'],
                ['2026-03-20', 'Forgot to clock in',                      '08:05', '17:00', 'pending',  'correction', null],
                ['2026-04-07', 'Missed clock-out',                        '08:00', '17:00', 'pending',  'correction', null],
            ],
            4 => [
                ['2026-01-17', 'OT — client presentation Q1',             '17:00', '21:00', 'approved', 'overtime',   'Confirmed by manager.'],
                ['2026-02-26', 'OT — month-end financial close',          '17:00', '20:00', 'approved', 'overtime',   'Approved.'],
                ['2026-03-28', 'OT — Q1 audit preparation',               '17:00', '19:30', 'pending',  'overtime',   null],
            ],
            5 => [
                ['2026-01-08', 'Device not reading fingerprint',          '08:10', '17:00', 'approved', 'correction', 'Finger was injured; device error.'],
                ['2026-04-14', 'Forgot to clock in after lunch',          '08:00', '17:00', 'pending',  'correction', null],
            ],
            6 => [
                ['2026-02-14', 'OT — emergency equipment maintenance',    '17:00', '20:00', 'approved', 'overtime',   'Verified by operations head.'],
                ['2026-03-21', 'Missed clock-out during shift handover',  '08:00', '18:00', 'approved', 'correction', 'Handover log checked.'],
            ],
            7 => [
                ['2026-01-24', 'Biometric scanner offline for 1 hour',    '08:00', '17:00', 'approved', 'correction', 'IT confirmed downtime.'],
                ['2026-03-07', 'OT request — weekend ops coverage',       '08:00', '17:00', 'pending',  'overtime',   null],
            ],
            8 => [
                ['2026-01-06', 'OT — post-launch monitoring',             '17:00', '22:00', 'approved', 'overtime',   'Approved. Deployment log attached.'],
                ['2026-02-24', 'OT — security patch deployment',          '17:00', '20:30', 'approved', 'overtime',   'Approved. Change request attached.'],
                ['2026-03-10', 'OT — system migration sprint',            '17:00', '22:00', 'approved', 'overtime',   'Approved.'],
            ],
            9 => [
                ['2026-02-18', 'Forgot to clock in — card reader busy',   '07:58', '17:00', 'approved', 'correction', 'Verified.'],
                ['2026-04-02', 'Missed clock-out on special holiday',     '08:00', '17:00', 'rejected', 'correction', 'Holiday; no work approved for this employee.'],
            ],
        ];

        foreach ($byEmployee[$idx] ?? [] as [$date, $reason, $reqIn, $reqOut, $status, $type, $note]) {
            if (AttendanceCorrection::where('user_id', $emp->id)->where('date', $date)->exists()) {
                continue;
            }

            $payload = [
                'user_id'             => $emp->id,
                'date'                => $date,
                'reason'              => $reason,
                'requested_clock_in'  => $reqIn,
                'requested_clock_out' => $reqOut,
                'status'              => $status,
                'type'                => $type,
            ];

            if ($status !== 'pending') {
                $payload['reviewed_by'] = $this->admin->id;
                $payload['reviewed_at'] = Carbon::parse($date)->addDays(1)->toDateTimeString();
                $payload['admin_note']  = $note;
            }

            AttendanceCorrection::create($payload);
        }
    }

    // ─── PAYSLIPS ─────────────────────────────────────────────────────────────

    private function generatePayslip(User $emp, Carbon $start, Carbon $end): void
    {
        if (Payslip::where('user_id', $emp->id)->where('period_start', $start->toDateString())->exists()) {
            return;
        }

        try {
            $result = $this->payroll->compute($emp, $start, $end);
            $s      = $result['summary'];

            $payslip = Payslip::create([
                'user_id'             => $emp->id,
                'period_start'        => $start->toDateString(),
                'period_end'          => $end->toDateString(),
                'pay_date'            => $end->copy()->addDays(3)->toDateString(),
                'monthly_salary'      => $s['monthly_salary'],
                'daily_rate'          => $s['daily_rate'],
                'basic_pay'           => $s['basic_pay'],
                'gross_pay'           => $s['gross_pay'],
                'total_deductions'    => $s['total_deductions'],
                'net_pay'             => $s['net_pay'],
                'days_scheduled'      => $s['days_scheduled'],
                'days_worked'         => $s['days_worked'],
                'days_absent'         => $s['days_absent'],
                'late_minutes'        => $s['late_minutes'],
                'undertime_minutes'   => $s['undertime_minutes'],
                'ot_minutes'          => $s['ot_minutes'],
                'rest_day_minutes'    => $s['rest_day_minutes'],
                'rest_day_ot_minutes' => $s['rest_day_ot_minutes'],
                'cutoff_type'         => $s['cutoff_type'],
                'taxable_income'      => $s['taxable_income'],
                'status'              => 'released',
                'generated_by'        => $this->admin->id,
                'released_at'         => now(),
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
        } catch (\Throwable $e) {
            $this->command->warn(
                "  ⚠ Skipped payslip for {$emp->name} [{$start->toDateString()}–{$end->toDateString()}]: "
                . $e->getMessage()
            );
        }
    }

    // ─── TEAMS ────────────────────────────────────────────────────────────────

    private function seedTeams(array $employees): void
    {
        $byIdx = collect($employees)->keyBy('idx');

        // Engineering team — Mark (admin) manages, Lisa (team_lead) leads
        $engTeam = Team::updateOrCreate(
            ['name' => 'Engineering Team'],
            [
                'description' => 'Product development, infrastructure, and technical operations',
                'leader_id'   => $byIdx[9]['user']->id,  // Lisa Navarro
                'manager_id'  => $byIdx[8]['user']->id,  // Mark Torres
            ]
        );
        $engTeam->members()->syncWithoutDetaching([
            $byIdx[0]['user']->id, // Ana Santos
            $byIdx[1]['user']->id, // Jose Reyes
            $byIdx[8]['user']->id, // Mark Torres
            $byIdx[9]['user']->id, // Lisa Navarro
        ]);

        // Ops & Finance team — Carlo leads, Maria manages
        $opsTeam = Team::updateOrCreate(
            ['name' => 'Operations & Finance'],
            [
                'description' => 'Business operations, logistics, and financial reporting',
                'leader_id'   => $byIdx[4]['user']->id,  // Carlo Tan
                'manager_id'  => $byIdx[2]['user']->id,  // Maria Cruz
            ]
        );
        $opsTeam->members()->syncWithoutDetaching([
            $byIdx[2]['user']->id, // Maria Cruz
            $byIdx[3]['user']->id, // Pedro Lim
            $byIdx[4]['user']->id, // Carlo Tan
            $byIdx[5]['user']->id, // Grace Dela Rosa
            $byIdx[6]['user']->id, // Ramon Flores
            $byIdx[7]['user']->id, // Jenny Villanueva
        ]);
    }
}
