<?php
/**
 * QA script — Training entries & Schedule overrides wired into PayslipComputationService.
 *
 * Tests:
 *  1.  Training day carve-out, days_worked method
 *        – training day NOT in daysWorked; TRAINING_PAY added at hourly rate
 *  2.  Training day carve-out, flat_rate method
 *        – training day deducted like absent from flat base; TRAINING_PAY adds back hours
 *  3.  Schedule override: shift_start/shift_end change
 *        – employee on-time per override → 0 late minutes
 *        – without the override the same clock-in would be 120 min late
 *  4.  Schedule override promotes_to_workday: rest day counted as scheduled
 *        – Saturday gains daysScheduled entry; absence on it counted as daysAbsent
 *
 * Run from project root:  php scripts/qa_training_override.php
 * All DB writes are wrapped in a transaction that is rolled back at the end.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;
use App\Models\User;
use App\Models\Schedule;
use App\Models\ScheduleOverride;
use App\Models\TimeLog;
use App\Models\TrainingEntry;
use App\Services\PayslipComputationService;

// ── Helpers ────────────────────────────────────────────────────────────────
$pass = 0; $fail = 0;

function qa(string $label, mixed $got, mixed $expected): void {
    global $pass, $fail;
    $ok = (is_float($got) || is_float($expected))
        ? abs((float)$got - (float)$expected) < 0.02   // ±2 cents tolerance
        : $got === $expected;
    if ($ok) {
        echo "  [PASS] {$label}\n";
        $pass++;
    } else {
        $e = is_float($expected) ? number_format((float)$expected, 4) : var_export($expected, true);
        $g = is_float($got)      ? number_format((float)$got,      4) : var_export($got,      true);
        echo "  [FAIL] {$label}\n         expected: {$e}\n         got:      {$g}\n";
        $fail++;
    }
}

// Manila 08:00 → UTC: Manila is UTC+8, so 08:00 Manila = 00:00 UTC
function manilaToUtc(string $date, string $localTime): string {
    return Carbon::parse("{$date} {$localTime}", 'Asia/Manila')
        ->setTimezone('UTC')
        ->format('Y-m-d H:i:s');
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
DB::beginTransaction();

try {
    $svc = app(PayslipComputationService::class);

    $role = Role::firstOrCreate(['slug' => 'employee'], ['name' => 'Employee', 'level' => 1]);

    // Shared period: May 1–15 2026
    // Work days in period (Mon–Fri): May 4,5,6,7,8,11,12,13,14,15  → 10 days
    $periodStart = Carbon::parse('2026-05-01');
    $periodEnd   = Carbon::parse('2026-05-15');

    $salary    = 30000.0;
    // daily_rate = round(30000 / 22, 4) = 1363.6364  (5-day week, divisor 22)
    $dailyRate = round($salary / 22.0, 4);   // 1363.6364
    $hourlyRate = $dailyRate / 8.0;           // 170.4545…

    // ────────────────────────────────────────────────────────────────────────
    // ── TEST 1: Training day carve-out — days_worked method ─────────────────
    // ────────────────────────────────────────────────────────────────────────
    echo "\n=== TEST 1: Training carve-out (days_worked) ===\n";

    $emp1 = User::create([
        'first_name' => 'QA1', 'middle_name' => '', 'last_name' => 'TrainingWorked',
        'email'     => 'qa.training.worked+' . uniqid() . '@example.local',
        'password'  => Hash::make('password'),
        'monthly_salary' => $salary,
    ]);
    $emp1->roles()->attach($role->id);
    Schedule::create([
        'user_id'     => $emp1->id,
        'work_days'   => ['Mon','Tue','Wed','Thu','Fri'],
        'shift_start' => '08:00',
        'shift_end'   => '17:00',
    ]);

    // 9 days with normal clock-in; May 7 (Thu) is the training day — no time log
    $workedDates = ['2026-05-04','2026-05-05','2026-05-06','2026-05-08',
                    '2026-05-11','2026-05-12','2026-05-13','2026-05-14','2026-05-15'];
    foreach ($workedDates as $dt) {
        TimeLog::create([
            'user_id'    => $emp1->id,
            'date'       => $dt,
            'clock_in'   => manilaToUtc($dt, '08:00'),
            'clock_out'  => manilaToUtc($dt, '17:00'),
            'lunch_start'=> manilaToUtc($dt, '12:00'),
            'lunch_end'  => manilaToUtc($dt, '13:00'),
        ]);
    }

    // Training entry on May 7: 4 hours
    TrainingEntry::create([
        'user_id'     => $emp1->id,
        'date'        => '2026-05-07',
        'hours'       => 4.0,
        'description' => 'QA: Safety drill',
        'created_by'  => null,
    ]);

    $r1 = $svc->compute($emp1, $periodStart, $periodEnd, 0.0, '', 'days_worked');
    $s1 = $r1['summary'];

    // May 1–15 has 11 scheduled work days (Mon–Fri includes May 1=Fri).
    // Worked: 9 logs (May 4,5,6,8,11,12,13,14,15). Absent: May 1 (no log, no training). Training: May 7.
    qa('T1 days_scheduled = 11', (int)$s1['days_scheduled'],  11);
    qa('T1 days_worked    = 9',  (float)$s1['days_worked'],   9.0);
    qa('T1 days_absent    = 1',  (float)$s1['days_absent'],   1.0);  // May 1 only
    qa('T1 training_days  = 1',  (int)$s1['training_days'],   1);

    // basic_pay = 9 × 1363.6364 = 12272.73
    $expectedBasic1 = round(9 * $dailyRate, 2);
    qa('T1 basic_pay',            (float)$s1['basic_pay'],     $expectedBasic1);

    // TRAINING_PAY = 4 × (dailyRate / 8) = 4 × 170.4545 = 681.82
    $expectedTrainingPay = round(4 * $hourlyRate, 2);
    $trainingLine1 = collect($r1['earnings'])->firstWhere('code', 'TRAINING_PAY');
    qa('T1 TRAINING_PAY line exists',  $trainingLine1 !== null, true);
    qa('T1 TRAINING_PAY amount',       (float)($trainingLine1['amount'] ?? 0), $expectedTrainingPay);

    // ────────────────────────────────────────────────────────────────────────
    // ── TEST 2: Training day carve-out — flat_rate method ───────────────────
    // ────────────────────────────────────────────────────────────────────────
    echo "\n=== TEST 2: Training carve-out (flat_rate) ===\n";

    $emp2 = User::create([
        'first_name' => 'QA2', 'middle_name' => '', 'last_name' => 'TrainingFlat',
        'email'     => 'qa.training.flat+' . uniqid() . '@example.local',
        'password'  => Hash::make('password'),
        'monthly_salary' => $salary,
    ]);
    $emp2->roles()->attach($role->id);
    Schedule::create([
        'user_id'     => $emp2->id,
        'work_days'   => ['Mon','Tue','Wed','Thu','Fri'],
        'shift_start' => '08:00',
        'shift_end'   => '17:00',
    ]);

    foreach ($workedDates as $dt) {
        TimeLog::create([
            'user_id'    => $emp2->id,
            'date'       => $dt,
            'clock_in'   => manilaToUtc($dt, '08:00'),
            'clock_out'  => manilaToUtc($dt, '17:00'),
            'lunch_start'=> manilaToUtc($dt, '12:00'),
            'lunch_end'  => manilaToUtc($dt, '13:00'),
        ]);
    }
    TrainingEntry::create([
        'user_id'     => $emp2->id,
        'date'        => '2026-05-07',
        'hours'       => 4.0,
        'description' => 'QA: Safety drill',
        'created_by'  => null,
    ]);

    $r2 = $svc->compute($emp2, $periodStart, $periodEnd, 0.0, '', 'flat_rate');
    $s2 = $r2['summary'];

    qa('T2 training_days  = 1',   (int)$s2['training_days'],  1);
    qa('T2 days_absent    = 1',   (float)$s2['days_absent'],  1.0);  // May 1 only

    // flat_rate: base = 15000, deduction = (1 absent May1 + 1 training May7) × dailyRate
    $expectedBasic2 = round(15000.0 - 2 * $dailyRate, 2);   // 15000 - 2×1363.6364 = 12272.73
    qa('T2 basic_pay',            (float)$s2['basic_pay'],   $expectedBasic2);

    $trainingLine2 = collect($r2['earnings'])->firstWhere('code', 'TRAINING_PAY');
    qa('T2 TRAINING_PAY line exists', $trainingLine2 !== null, true);
    qa('T2 TRAINING_PAY amount',      (float)($trainingLine2['amount'] ?? 0), $expectedTrainingPay);

    // Net compensation for the training day:
    //   flat_rate deducts 1 × dailyRate, TRAINING_PAY adds back (hours/8) × dailyRate
    //   → net = TRAINING_PAY - dailyRate  (employee paid only for 4 hours)
    $netTrainingDayPay = $expectedTrainingPay - $dailyRate;
    // Gross pay should equal: (basic without training deduction) + training pay adjustments
    // Easier check: T2 basic_pay + T2 TRAINING_PAY ≈ T1 basic_pay + T1 TRAINING_PAY  (both methods same gross)
    $t1Comparable = (float)$s1['basic_pay'] + $expectedTrainingPay;
    $t2Comparable = (float)$s2['basic_pay'] + $expectedTrainingPay;
    qa('T2 gross before other earnings matches T1',
        abs($t1Comparable - $t2Comparable) < 0.05, true);

    // ────────────────────────────────────────────────────────────────────────
    // ── TEST 3: Schedule override — shift_start / shift_end ─────────────────
    // 10:00–19:00 override on May 13; employee clocks in at exactly 10:00 Manila.
    // Without the override the 08:00 schedule would show 120 min late.
    // ────────────────────────────────────────────────────────────────────────
    echo "\n=== TEST 3: Schedule override shift times ===\n";

    $emp3 = User::create([
        'first_name' => 'QA3', 'middle_name' => '', 'last_name' => 'OverrideShift',
        'email'     => 'qa.override.shift+' . uniqid() . '@example.local',
        'password'  => Hash::make('password'),
        'monthly_salary' => $salary,
    ]);
    $emp3->roles()->attach($role->id);
    Schedule::create([
        'user_id'     => $emp3->id,
        'work_days'   => ['Mon','Tue','Wed','Thu','Fri'],
        'shift_start' => '08:00',
        'shift_end'   => '17:00',
    ]);

    // All 10 work days with normal clock-in (08:00 Manila), except May 13 which clocks
    // in at 10:00 Manila (= 120 min late if no override, 0 min late with override)
    $allWorkDates = [...$workedDates, '2026-05-07'];  // include May 7 (override day below)
    sort($allWorkDates);
    foreach ($allWorkDates as $dt) {
        $clockIn  = ($dt === '2026-05-13') ? '10:00' : '08:00';
        $clockOut = ($dt === '2026-05-13') ? '19:00' : '17:00';
        TimeLog::create([
            'user_id'    => $emp3->id,
            'date'       => $dt,
            'clock_in'   => manilaToUtc($dt, $clockIn),
            'clock_out'  => manilaToUtc($dt, $clockOut),
            'lunch_start'=> manilaToUtc($dt, '12:00'),
            'lunch_end'  => manilaToUtc($dt, '13:00'),
        ]);
    }

    // Override on May 13: new shift 10:00–19:00
    ScheduleOverride::create([
        'user_id'              => $emp3->id,
        'date'                 => '2026-05-13',
        'shift_start'          => '10:00:00',
        'shift_end'            => '19:00:00',
        'promotes_to_workday'  => false,
        'note'                 => 'QA: extended shift',
        'created_by'           => null,
    ]);

    $r3 = $svc->compute($emp3, $periodStart, $periodEnd, 0.0, '', 'days_worked');
    $s3 = $r3['summary'];

    qa('T3 days_worked = 10',   (float)$s3['days_worked'],  10.0);
    qa('T3 late_minutes = 0',   (int)$s3['late_minutes'],   0);   // on time per override
    qa('T3 undertime_minutes = 0', (int)$s3['undertime_minutes'], 0);
    qa('T3 no TRAINING_PAY',    collect($r3['earnings'])->firstWhere('code', 'TRAINING_PAY'), null);

    // ────────────────────────────────────────────────────────────────────────
    // ── TEST 4: Schedule override promotes_to_workday ────────────────────────
    // May 9 is a Saturday (rest day). Override promotes it to a work day.
    // Employee has no time log → counted as daysAbsent (1 extra scheduled day).
    // ────────────────────────────────────────────────────────────────────────
    echo "\n=== TEST 4: Override promotes_to_workday ===\n";

    $emp4 = User::create([
        'first_name' => 'QA4', 'middle_name' => '', 'last_name' => 'PromoteDay',
        'email'     => 'qa.promote.day+' . uniqid() . '@example.local',
        'password'  => Hash::make('password'),
        'monthly_salary' => $salary,
    ]);
    $emp4->roles()->attach($role->id);
    Schedule::create([
        'user_id'     => $emp4->id,
        'work_days'   => ['Mon','Tue','Wed','Thu','Fri'],
        'shift_start' => '08:00',
        'shift_end'   => '17:00',
    ]);

    // All 11 normal work days present (May 1 + allWorkDates which includes May 7)
    $allWorkDatesFull = array_unique(array_merge(['2026-05-01'], $allWorkDates));
    sort($allWorkDatesFull);
    foreach ($allWorkDatesFull as $dt) {
        TimeLog::create([
            'user_id'    => $emp4->id,
            'date'       => $dt,
            'clock_in'   => manilaToUtc($dt, '08:00'),
            'clock_out'  => manilaToUtc($dt, '17:00'),
            'lunch_start'=> manilaToUtc($dt, '12:00'),
            'lunch_end'  => manilaToUtc($dt, '13:00'),
        ]);
    }

    // May 9 (Sat) override → promotes to work day, employee did NOT clock in
    ScheduleOverride::create([
        'user_id'              => $emp4->id,
        'date'                 => '2026-05-09',
        'shift_start'          => '08:00:00',
        'shift_end'            => '17:00:00',
        'promotes_to_workday'  => true,
        'note'                 => 'QA: makeup day',
        'created_by'           => null,
    ]);

    $r4 = $svc->compute($emp4, $periodStart, $periodEnd, 0.0, '', 'days_worked');
    $s4 = $r4['summary'];

    // 11 normal + 1 promoted Saturday = 12 scheduled; 11 worked + 1 absent (promoted Sat)
    qa('T4 days_scheduled = 12', (int)$s4['days_scheduled'],  12);
    qa('T4 days_worked    = 11', (float)$s4['days_worked'],   11.0);
    qa('T4 days_absent    = 1',  (float)$s4['days_absent'],   1.0);
    qa('T4 training_days  = 0',  (int)$s4['training_days'],   0);

    // basic_pay = 11 × dailyRate (11 days worked)
    $expectedBasic4 = round(11 * $dailyRate, 2);
    qa('T4 basic_pay (11 worked)', (float)$s4['basic_pay'],  $expectedBasic4);

    // ── Results ────────────────────────────────────────────────────────────
    echo "\n=== RESULTS: {$pass} passed, {$fail} failed ===\n";

    DB::rollBack();
    echo "Transaction rolled back — no data persisted.\n";
    exit($fail > 0 ? 1 : 0);

} catch (Throwable $e) {
    try { DB::rollBack(); } catch (Throwable $_) {}
    echo "\nQA ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
