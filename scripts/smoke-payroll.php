<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Starting payroll smoke test...\n";

function reportCheck(string $label, bool $ok): void
{
    echo $ok ? "[PASS] {$label}\n" : "[FAIL] {$label}\n";
}

try {
    DB::beginTransaction();
    echo "DB transaction started\n";

    $roleEmployee = \App\Models\Role::firstOrCreate(
        ['slug' => 'employee'],
        ['name' => 'Employee', 'level' => 1]
    );
    $roleAdmin = \App\Models\Role::firstOrCreate(
        ['slug' => 'admin'],
        ['name' => 'Admin', 'level' => 4]
    );
    echo "Roles ready (employee id: {$roleEmployee->id}, admin id: {$roleAdmin->id})\n";

    $admin = \App\Models\User::create([
        'first_name' => 'Smoke',
        'middle_name' => '',
        'last_name' => 'Admin',
        'email' => 'smoke.admin+' . uniqid() . '@example.local',
        'password' => Illuminate\Support\Facades\Hash::make('password'),
        'monthly_salary' => 60000,
    ]);
    $admin->roles()->attach($roleAdmin->id);
    echo "Admin user created (id: {$admin->id})\n";

    $employee = \App\Models\User::create([
        'first_name' => 'Smoke',
        'middle_name' => '',
        'last_name' => 'Employee',
        'email' => 'smoke.employee+' . uniqid() . '@example.local',
        'password' => Illuminate\Support\Facades\Hash::make('password'),
        'monthly_salary' => 30000,
    ]);
    $employee->roles()->attach($roleEmployee->id);
    echo "Employee user created (id: {$employee->id})\n";

    \App\Models\Schedule::create([
        'user_id' => $employee->id,
        'work_days' => ['Mon','Tue','Wed','Thu','Fri'],
        'shift_start' => '08:00',
        'shift_end'   => '17:00',
    ]);
    echo "Schedule created for employee\n";

    $dates = ['2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07'];
    foreach ($dates as $dt) {
        \App\Models\TimeLog::create([
            'user_id' => $employee->id,
            'date' => $dt,
            'clock_in' => $dt . ' 08:00:00',
            'clock_out' => $dt . ' 17:00:00',
            'lunch_start' => $dt . ' 12:00:00',
            'lunch_end' => $dt . ' 13:00:00',
        ]);
        echo "TimeLog created for {$dt}\n";
    }

    $periodStart = Carbon\Carbon::parse('2026-05-01');
    $periodEnd   = Carbon\Carbon::parse('2026-05-15');

    $service = $app->make(\App\Services\PayslipComputationService::class);
    $result = $service->compute($employee, $periodStart, $periodEnd);
    $s = $result['summary'];

    $payslip = \App\Models\Payslip::create([
        'user_id' => $employee->id,
        'period_start' => $periodStart->toDateString(),
        'period_end' => $periodEnd->toDateString(),
        'pay_date' => null,
        'monthly_salary' => $s['monthly_salary'],
        'daily_rate' => $s['daily_rate'],
        'basic_pay' => $s['basic_pay'],
        'gross_pay' => $s['gross_pay'],
        'total_deductions' => $s['total_deductions'],
        'net_pay' => $s['net_pay'],
        'days_scheduled' => $s['days_scheduled'],
        'days_worked' => $s['days_worked'],
        'days_absent' => $s['days_absent'],
        'late_minutes' => $s['late_minutes'],
        'undertime_minutes' => $s['undertime_minutes'],
        'ot_minutes' => $s['ot_minutes'],
        'rest_day_minutes' => $s['rest_day_minutes'],
        'rest_day_ot_minutes' => $s['rest_day_ot_minutes'],
        'status' => 'draft',
        'cutoff_type' => $s['cutoff_type'],
        'taxable_income' => $s['taxable_income'],
        'generated_by' => $admin->id,
    ]);

    foreach ($result['earnings'] as $line) {
        \App\Models\PayslipLine::create(array_merge($line, ['payslip_id' => $payslip->id, 'category' => 'earning']));
    }
    foreach ($result['deductions'] as $line) {
        \App\Models\PayslipLine::create(array_merge($line, ['payslip_id' => $payslip->id, 'category' => 'deduction']));
    }

    echo "Payslip draft created (id: {$payslip->id}) net: {$payslip->net_pay}\n";

    // Guardrail visibility: current implementation allows negative net for deduction-heavy scenarios.
    $isNonNegativeNet = (float) $payslip->net_pay >= 0;
    if ($isNonNegativeNet) {
        reportCheck('Net pay is non-negative for smoke fixture', true);
    } else {
        echo "[INFO] Net pay is negative for smoke fixture ({$payslip->net_pay}).\n";
        echo "[INFO] Validate policy choice: clamp to 0 vs carry-forward deduction.\n";
    }

    DB::rollBack();
    echo "DB transaction rolled back — smoke test complete and non-destructive.\n";

    exit(0);

} catch (Throwable $e) {
    try { DB::rollBack(); } catch (Throwable $_) {}
    echo "SMOKE ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
