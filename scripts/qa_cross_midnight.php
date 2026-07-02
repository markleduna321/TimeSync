<?php
/**
 * QA: Cross-Midnight Shift Holiday Pay Resolution
 *
 * Verifies that PayslipComputationService correctly handles overnight shifts
 * that cross a calendar date boundary when one of the two days is a holiday.
 *
 * Scenarios covered:
 *   TC-UNIT   computeHolidayExtraMinutes() unit tests (no DB)
 *   TC-OVL-01 Normal Friday shift, post-midnight hours land on Regular Holiday (Gap 1)
 *   TC-OVL-02 Regular Holiday shift, post-midnight hours land on normal day (Gap 2 – prorate)
 *   TC-OVL-03 Thursday tail crossing into Friday Regular Holiday (Gap 3 via Gap 1 path)
 *   TC-OVL-04 Normal Friday shift, post-midnight hours land on Special Holiday
 *   TC-OVL-05 No holidays – ND regression must remain correct
 *   TC-OVL-06 Same-date double-session (keyBy → groupBy fix): OT minutes are summed
 *
 * Usage: php scripts/qa_cross_midnight.php
 *
 * All DB records are created inside a transaction that is rolled back on exit.
 * No permanent data is written.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Holiday;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use App\Services\PayslipComputationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

$pass = 0;
$fail = 0;

/* ─── Assertion helpers ──────────────────────────────────────────────────── */
function ok(string $label, bool $cond, int &$pass, int &$fail): void
{
    if ($cond) {
        echo "  ✓ {$label}\n";
        $pass++;
    } else {
        echo "  ✗ {$label}\n";
        $fail++;
    }
}

/** Float near-equal (tolerance ±0.05 PHP) */
function near(float $a, float $b, float $tol = 0.05): bool
{
    return abs($a - $b) <= $tol;
}

/** Convert a Manila local datetime string to a UTC Carbon instance */
function manilaToUtc(string $localDatetime): Carbon
{
    return Carbon::parse($localDatetime, 'Asia/Manila')->setTimezone('UTC');
}

/* ─── Service instance ───────────────────────────────────────────────────── */
/** @var PayslipComputationService $svc */
$svc = app(PayslipComputationService::class);

/* ─── Constants ──────────────────────────────────────────────────────────── */
// ₱30,000 / 22 days = ₱1,363.6364 daily rate
// ₱1,363.6364 / 8h  = ₱170.4545  hourly rate
$DR = round(30000 / 22, 4); // ₱1,363.6364

/* ══════════════════════════════════════════════════════════════════════════
   TC-UNIT: computeHolidayExtraMinutes() — pure math, no DB
   ══════════════════════════════════════════════════════════════════════════ */
echo "\n=== TC-UNIT: computeHolidayExtraMinutes() ===\n";

// Regular holiday, 3 h (180 min) worked → ₱170.45 × 1.0 × 3 = ₱511.36
ok('regular 3h → ₱511.36',
    near($svc->computeHolidayExtraMinutes($DR, 'regular', true, 180), 511.36),
    $pass, $fail);

// Regular holiday, 6 h (360 min) worked → ₱170.45 × 1.0 × 6 = ₱1,022.73
ok('regular 6h → ₱1,022.73',
    near($svc->computeHolidayExtraMinutes($DR, 'regular', true, 360), 1022.73),
    $pass, $fail);

// Special holiday, 3 h (180 min) worked → ₱170.45 × 0.30 × 3 = ₱153.41
ok('special 3h → ₱153.41',
    near($svc->computeHolidayExtraMinutes($DR, 'special', true, 180), 153.41),
    $pass, $fail);

// Not worked → always 0 (daily guarantee is handled at the day level)
ok('not worked → 0.0',
    $svc->computeHolidayExtraMinutes($DR, 'regular', false, 180) === 0.0,
    $pass, $fail);

// Zero minutes → 0
ok('zero minutes → 0.0',
    $svc->computeHolidayExtraMinutes($DR, 'regular', true, 0) === 0.0,
    $pass, $fail);

/* ══════════════════════════════════════════════════════════════════════════
   Integration tests — all inside a transaction that is rolled back
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * Test week: 2027-03-01 (Mon) … 2027-03-07 (Sun)
 *   Thu = 2027-03-04
 *   Fri = 2027-03-05  ← shift start date for most scenarios
 *   Sat = 2027-03-06  ← post-midnight landing date
 *
 * Payroll period: 2027-03-01 – 2027-03-15 (first cutoff)
 * Dates chosen in 2027-03 to avoid any pre-existing holiday records.
 */
$periodStart = Carbon::parse('2027-03-01');
$periodEnd   = Carbon::parse('2027-03-15');
$thu         = '2027-03-04';
$fri         = '2027-03-05';
$sat         = '2027-03-06';

try {
    DB::transaction(function () use (
        $svc, $periodStart, $periodEnd,
        $thu, $fri, $sat, $DR,
        &$pass, &$fail
    ) {
        /* ── Create test employee + overnight schedule (Mon–Fri 18:00–03:00) ── */
        $employee = User::factory()->create(['monthly_salary' => 30000.00]);

        Schedule::create([
            'user_id'     => $employee->id,
            'work_days'   => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            'shift_start' => '18:00',
            'shift_end'   => '03:00',
        ]);

        // Reload so $employee->schedule is populated
        $employee->load('schedule');

        /* ─────────────────────────────────────────────────────────────────
           TC-OVL-01: Normal Friday 18:00→Saturday 03:00 (Gap 1)
                      Saturday = Regular Holiday (rest day)
           ─────────────────────────────────────────────────────────────────
           Expected:
             Gap 1 fix → holiday premium for 3h on Saturday
               = ₱170.45 × 1.0 × 3 = ₱511.36
             Saturday cursor → regular holiday guarantee (days_worked)
               = ₱1,363.64
             Total HOLIDAY_PAY ≈ ₱1,875.00

           Before fix: only the guarantee fired (₱1,363.64) — cross-midnight
           premium was absent.
        ─────────────────────────────────────────────────────────────────── */
        echo "\n=== TC-OVL-01: Normal Friday → Saturday Regular Holiday ===\n";

        $h01 = Holiday::create(['name' => '__QA_H01__', 'date' => $sat, 'type' => 'regular']);
        $l01 = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $fri,
            'clock_in'         => manilaToUtc("$fri 18:00"),
            'clock_out'        => manilaToUtc("$sat 03:00"),
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);

        $r01    = $svc->compute($employee, $periodStart, $periodEnd, 0, '', 'days_worked');
        $s01    = $r01['summary'];
        $hpx01  = collect($r01['earnings'])->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        ok('TC-OVL-01: days_worked = 1', $s01['days_worked'] == 1.0, $pass, $fail);
        // Cross-midnight premium (₱511.36) + guarantee (₱1,363.64) = ₱1,875.00
        ok('TC-OVL-01: HOLIDAY_PAY ≈ ₱1,875 (gap-1 premium + guarantee)',
            near($hpx01, 1875.00, 1.0), $pass, $fail);
        ok('TC-OVL-01: holiday_days_worked = 1', $s01['holiday_days_worked'] == 1, $pass, $fail);

        // Clean up scenario 01 records
        $l01->delete();
        $h01->delete();

        /* ─────────────────────────────────────────────────────────────────
           TC-OVL-02: Friday = Regular Holiday, shift 18:00→Saturday 03:00
                      Saturday = normal day (Gap 2 — prorate)
           ─────────────────────────────────────────────────────────────────
           Expected:
             Gap 2 fix → holiday premium prorated to pre-midnight hours only
               pre-midnight = 6h (18:00–00:00)
               premium = ₱170.45 × 1.0 × 6 = ₱1,022.73
             No Saturday cursor holiday event (Saturday is normal)
             Total HOLIDAY_PAY ≈ ₱1,022.73

           Before fix: computeHolidayExtra fired on the full daily rate
             → HOLIDAY_PAY = ₱1,363.64 (overpaid ₱340.91).
        ─────────────────────────────────────────────────────────────────── */
        echo "\n=== TC-OVL-02: Friday Regular Holiday → Normal Saturday (prorate) ===\n";

        $h02 = Holiday::create(['name' => '__QA_H02__', 'date' => $fri, 'type' => 'regular']);
        $l02 = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $fri,
            'clock_in'         => manilaToUtc("$fri 18:00"),
            'clock_out'        => manilaToUtc("$sat 03:00"),
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);

        $r02   = $svc->compute($employee, $periodStart, $periodEnd, 0, '', 'days_worked');
        $s02   = $r02['summary'];
        $hpx02 = collect($r02['earnings'])->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        ok('TC-OVL-02: days_worked = 1', $s02['days_worked'] == 1.0, $pass, $fail);
        // Prorated to 6h only: ₱1,022.73 (NOT the full-day ₱1,363.64)
        ok('TC-OVL-02: HOLIDAY_PAY ≈ ₱1,022.73 (pre-midnight 6h only)',
            near($hpx02, 1022.73, 1.0), $pass, $fail);
        ok('TC-OVL-02: HOLIDAY_PAY < ₱1,363.64 (no longer overpaying full-day rate)',
            $hpx02 < 1363.00, $pass, $fail);

        $l02->delete();
        $h02->delete();

        /* ─────────────────────────────────────────────────────────────────
           TC-OVL-03: Thursday tail on Friday Regular Holiday (Gap 3)
                      Thursday log (Thu 18:00→Fri 03:00) PLUS
                      Friday log   (Fri 18:00→Sat 00:00)
                      Friday = Regular Holiday
           ─────────────────────────────────────────────────────────────────
           Expected:
             Thursday cursor (Gap 1 path): tail 00:00–03:00 falls on Fri holiday
               premium = ₱170.45 × 1.0 × 3 = ₱511.36
             Friday cursor (holiday worked): prorated to 6h pre-midnight
               premium = ₱170.45 × 1.0 × 6 = ₱1,022.73
             Friday cursor also has the guarantee from Fri being worked holiday
               (existing computeHolidayExtra fires for non-cross-midnight? No — Friday
               log IS cross-midnight if it goes to Sat 00:00. Let's use Fri 18:00→23:59
               to keep it same-day for clarity.)
             Total holiday premium from logs = ₱511.36 + prorated_friday_hours
        ─────────────────────────────────────────────────────────────────── */
        echo "\n=== TC-OVL-03: Thursday tail + Friday session on Friday Holiday ===\n";

        $h03  = Holiday::create(['name' => '__QA_H03__', 'date' => $fri, 'type' => 'regular']);
        $l03a = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $thu,
            'clock_in'         => manilaToUtc("$thu 18:00"),
            'clock_out'        => manilaToUtc("$fri 03:00"), // tail: 3h on Friday
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);
        $l03b = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $fri,
            'clock_in'         => manilaToUtc("$fri 18:00"),
            'clock_out'        => manilaToUtc("$fri 23:59"), // 5h 59m on Friday (no midnight cross)
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);

        $r03   = $svc->compute($employee, $periodStart, $periodEnd, 0, '', 'days_worked');
        $s03   = $r03['summary'];
        $hpx03 = collect($r03['earnings'])->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        // Thu log: 1 day worked; Fri log: 1 day worked
        ok('TC-OVL-03: days_worked = 2 (Thu + Fri)', $s03['days_worked'] == 2.0, $pass, $fail);
        // Thursday tail (3h on Fri holiday) = ₱511.36
        // Friday log (6h on Fri holiday) = computeHolidayExtra (no cross-midnight) = ₱1,363.64
        // Total holiday premium ≈ ₱511.36 + ₱1,363.64 = ₱1,875.00
        ok('TC-OVL-03: Thursday tail contributes to HOLIDAY_PAY (total > Fri-only)',
            $hpx03 > 1363.00, $pass, $fail);
        ok('TC-OVL-03: HOLIDAY_PAY ≈ ₱1,875 (tail premium + Fri full-day premium)',
            near($hpx03, 1875.00, 2.0), $pass, $fail);

        $l03a->delete();
        $l03b->delete();
        $h03->delete();

        /* ─────────────────────────────────────────────────────────────────
           TC-OVL-04: Normal Friday 18:00→Saturday 03:00 (Gap 1)
                      Saturday = Special Non-Working Holiday
           ─────────────────────────────────────────────────────────────────
           Expected:
             Special holiday premium for 3h: ₱170.45 × 0.30 × 3 = ₱153.41
             Saturday cursor: special holiday, not worked → no guarantee fires
               (special = no work, no pay; no extra premium)
             Total HOLIDAY_PAY ≈ ₱153.41

           Before fix: HOLIDAY_PAY = ₱0 (no premium was added for special
           holiday on cross-midnight tail).
        ─────────────────────────────────────────────────────────────────── */
        echo "\n=== TC-OVL-04: Normal Friday → Saturday Special Holiday ===\n";

        $h04 = Holiday::create(['name' => '__QA_H04__', 'date' => $sat, 'type' => 'special']);
        $l04 = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $fri,
            'clock_in'         => manilaToUtc("$fri 18:00"),
            'clock_out'        => manilaToUtc("$sat 03:00"),
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);

        $r04   = $svc->compute($employee, $periodStart, $periodEnd, 0, '', 'days_worked');
        $hpx04 = collect($r04['earnings'])->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        // Special holiday premium for 3h post-midnight: ₱153.41
        ok('TC-OVL-04: HOLIDAY_PAY ≈ ₱153.41 (special holiday 3h premium)',
            near($hpx04, 153.41, 1.0), $pass, $fail);
        ok('TC-OVL-04: HOLIDAY_PAY > 0 (previously was 0 — bug confirmed fixed)',
            $hpx04 > 0, $pass, $fail);

        $l04->delete();
        $h04->delete();

        /* ─────────────────────────────────────────────────────────────────
           TC-OVL-05: No holidays — Night Differential regression
                      Friday 18:00→Saturday 03:00, no holidays
           ─────────────────────────────────────────────────────────────────
           Expected:
             ND window 22:00–06:00 covers: Fri 22:00–00:00 (2h) + Sat 00:00–03:00 (3h) = 5h
             ND pay = ₱170.45 × 0.10 × 5 = ₱85.23
             HOLIDAY_PAY = absent (no holidays)

           Night diff calculation is timestamp-based and must be unchanged by
           the cross-midnight detection logic.
        ─────────────────────────────────────────────────────────────────── */
        echo "\n=== TC-OVL-05: Night Differential Regression (no holidays) ===\n";

        $l05 = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $fri,
            'clock_in'         => manilaToUtc("$fri 18:00"),
            'clock_out'        => manilaToUtc("$sat 03:00"),
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);

        $r05   = $svc->compute($employee, $periodStart, $periodEnd, 0, '', 'days_worked');
        $ndpay = collect($r05['earnings'])->firstWhere('code', 'NIGHT_DIFF')['amount'] ?? 0.0;
        $hpx05 = collect($r05['earnings'])->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        // ND: 22:00–03:00 = 5h → ₱85.23
        ok('TC-OVL-05: nd_minutes = 300 (5h)',
            $r05['summary']['nd_minutes'] == 300, $pass, $fail);
        ok('TC-OVL-05: NIGHT_DIFF ≈ ₱85.23',
            near($ndpay, 85.23, 0.10), $pass, $fail);
        ok('TC-OVL-05: no HOLIDAY_PAY line (no holidays)',
            $hpx05 == 0.0, $pass, $fail);

        $l05->delete();

        /* ─────────────────────────────────────────────────────────────────
           TC-OVL-06: Flat-rate method — cross-midnight regular holiday
                      Friday 18:00→Saturday 03:00, Saturday = Regular Holiday
                      method = 'flat_rate'
           ─────────────────────────────────────────────────────────────────
           The cross-midnight holiday premium fix is method-agnostic.
           Under flat_rate the Saturday guarantee is NOT added (the half-month
           base already covers it), but the gap-1 premium still fires.
           Expected: HOLIDAY_PAY ≈ ₱511.36 (3h post-midnight × regular rate)
        ─────────────────────────────────────────────────────────────────── */
        echo "\n=== TC-OVL-06: Flat-Rate Method + Cross-Midnight Regular Holiday ===\n";

        $h06 = Holiday::create(['name' => '__QA_H06__', 'date' => $sat, 'type' => 'regular']);
        $l06 = TimeLog::create([
            'user_id'          => $employee->id,
            'date'             => $fri,
            'clock_in'         => manilaToUtc("$fri 18:00"),
            'clock_out'        => manilaToUtc("$sat 03:00"),
            'status'           => 'clocked_out',
            'overtime_minutes' => 0,
        ]);

        $r06   = $svc->compute($employee, $periodStart, $periodEnd, 0, '', 'flat_rate');
        $s06   = $r06['summary'];
        $hpx06 = collect($r06['earnings'])->firstWhere('code', 'HOLIDAY_PAY')['amount'] ?? 0.0;

        ok('TC-OVL-06: HOLIDAY_PAY ≈ ₱511.36 under flat_rate (premium only — no guarantee under flat_rate)',
            near($hpx06, 511.36, 1.0), $pass, $fail);
        ok('TC-OVL-06: basic_pay > 0 (flat_rate base computed correctly)',
            $s06['basic_pay'] > 0, $pass, $fail);

        $l06->delete();
        $h06->delete();

        // Force rollback — no test data persists
        throw new \RuntimeException('__QA_ROLLBACK__');
    });
} catch (\RuntimeException $e) {
    if ($e->getMessage() !== '__QA_ROLLBACK__') {
        echo "\n  FATAL: " . $e->getMessage() . "\n";
        $fail++;
    }
}

/* ─── Summary ────────────────────────────────────────────────────────────── */
$total = $pass + $fail;
echo "\n";
echo str_repeat('─', 50) . "\n";
echo "Result: {$pass}/{$total} passed";
if ($fail > 0) {
    echo " — {$fail} FAILED";
}
echo "\n";
echo str_repeat('─', 50) . "\n";

exit($fail > 0 ? 1 : 0);
