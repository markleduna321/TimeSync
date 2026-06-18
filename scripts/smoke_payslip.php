<?php
/**
 * Smoke test for PayslipComputationService helpers.
 * Run from the project root:  php scripts/smoke_payslip.php
 *
 * Tests:
 *  1. toMins / calcLateMinutes / calcUndertimeMinutes — day shift (08:00–17:00)
 *  2. calcLateMinutes / calcUndertimeMinutes — overnight 22:00–06:00 (midnight edge cases)
 *  3. calcLateMinutes / calcUndertimeMinutes — overnight 20:00–05:00 (8pm–5am)
 *  4. computeNightDiffMinutes — basic window + exclusion subtraction
 *  5. computeNightDiffMinutes — 20:00–05:00 shift (partial ND window overlap)
 */

require __DIR__ . '/../vendor/autoload.php';

use Carbon\Carbon;

// Bootstrap Laravel just enough to resolve the service
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$svc = app(\App\Services\PayslipComputationService::class);

// ── Reflection: expose private helpers ───────────────────────────────────────
$ref = new ReflectionClass($svc);
$toMins  = $ref->getMethod('toMins');   $toMins->setAccessible(true);
$calcLate = $ref->getMethod('calcLateMinutes'); $calcLate->setAccessible(true);
$calcUT   = $ref->getMethod('calcUndertimeMinutes'); $calcUT->setAccessible(true);

$pass = 0; $fail = 0;

function check(string $label, mixed $got, mixed $expected): void {
    global $pass, $fail;
    if ($got === $expected) {
        echo "  [PASS] {$label}\n";
        $pass++;
    } else {
        echo "  [FAIL] {$label} — expected {$expected}, got {$got}\n";
        $fail++;
    }
}

// ── 1. toMins ────────────────────────────────────────────────────────────────
echo "\n=== toMins ===\n";
check('00:00 → 0',    $toMins->invoke($svc, '00:00'), 0);
check('08:30 → 510',  $toMins->invoke($svc, '08:30'), 510);
check('20:00 → 1200', $toMins->invoke($svc, '20:00'), 1200);
check('22:00 → 1320', $toMins->invoke($svc, '22:00'), 1320);
check('23:59 → 1439', $toMins->invoke($svc, '23:59'), 1439);

// ── 2. Day shift 08:00–17:00 ─────────────────────────────────────────────────
echo "\n=== calcLateMinutes (day shift 08:00–17:00) ===\n";
check('On time',         $calcLate->invoke($svc, '08:00', '08:00', '17:00'), 0);
check('15 min late',     $calcLate->invoke($svc, '08:15', '08:00', '17:00'), 15);
check('Early (no late)', $calcLate->invoke($svc, '07:45', '08:00', '17:00'), 0);

echo "\n=== calcUndertimeMinutes (day shift 08:00–17:00) ===\n";
check('Full day (no UT)',    $calcUT->invoke($svc, '17:00', '08:00', '17:00'), 0);
check('30 min early out',   $calcUT->invoke($svc, '16:30', '08:00', '17:00'), 30);
check('Stayed late (no UT)',$calcUT->invoke($svc, '18:00', '08:00', '17:00'), 0);

// ── 3. Overnight shift 22:00–06:00 ───────────────────────────────────────────
echo "\n=== calcLateMinutes (overnight 22:00–06:00) ===\n";
check('22:00 on time',               $calcLate->invoke($svc, '22:00', '22:00', '06:00'), 0);
check('22:30 late (30 min)',         $calcLate->invoke($svc, '22:30', '22:00', '06:00'), 30);
// QA bug case: "00:30" > "22:00" was FALSE with old string comparison → 0. Should be 150.
// (1440 - 1320) + 30 = 150
check('00:30 late overnight (150)',  $calcLate->invoke($svc, '00:30', '22:00', '06:00'), 150);
check('05:45 late overnight (465)',  $calcLate->invoke($svc, '05:45', '22:00', '06:00'), 465);

echo "\n=== calcUndertimeMinutes (overnight 22:00–06:00) ===\n";
check('06:00 on time',                    $calcUT->invoke($svc, '06:00', '22:00', '06:00'), 0);
check('05:30 UT (30 min)',               $calcUT->invoke($svc, '05:30', '22:00', '06:00'), 30);
// QA bug case: "23:30" < "06:00" was FALSE with old string comparison → 0. Should be 390.
// (1440 + 360) - 1410 = 390
check('23:30 UT overnight (390)',         $calcUT->invoke($svc, '23:30', '22:00', '06:00'), 390);
check('07:00 after shiftEnd (no UT)',     $calcUT->invoke($svc, '07:00', '22:00', '06:00'), 0);

// ── 4. Overnight shift 20:00–05:00 (8 PM – 5 AM) ────────────────────────────
echo "\n=== calcLateMinutes (overnight 20:00–05:00) ===\n";
// On time — evening sector
check('20:00 on time',              $calcLate->invoke($svc, '20:00', '20:00', '05:00'), 0);
// 30 min late — evening sector
check('20:30 late (30 min)',        $calcLate->invoke($svc, '20:30', '20:00', '05:00'), 30);
// 1 hour late — evening sector
check('21:00 late (60 min)',        $calcLate->invoke($svc, '21:00', '20:00', '05:00'), 60);
// Crosses midnight — early-morning sector: (1440 - 1200) + 30 = 270
check('00:30 late overnight (270)', $calcLate->invoke($svc, '00:30', '20:00', '05:00'), 270);
// Within shiftEnd window (before 05:00) but far from shiftStart: (1440 - 1200) + 240 = 480
check('04:00 late overnight (480)', $calcLate->invoke($svc, '04:00', '20:00', '05:00'), 480);
// ── Dead zone cases (se ≤ ci < ss) — employee arrived EARLY, no late ──────────
// June 17 real-world case: clock-in 19:49, shift 20:00–05:00
check('19:49 dead zone (0 late)',   $calcLate->invoke($svc, '19:49', '20:00', '05:00'), 0);
check('18:00 dead zone (0 late)',   $calcLate->invoke($svc, '18:00', '20:00', '05:00'), 0);
check('05:01 dead zone (0 late)',   $calcLate->invoke($svc, '05:01', '20:00', '05:00'), 0);
check('12:00 dead zone (0 late)',   $calcLate->invoke($svc, '12:00', '20:00', '05:00'), 0);

echo "\n=== calcUndertimeMinutes (overnight 20:00–05:00) ===\n";
// On time
check('05:00 on time',                    $calcUT->invoke($svc, '05:00', '20:00', '05:00'), 0);
// 30 min early — early-morning sector (before shiftEnd 05:00)
check('04:30 UT (30 min)',               $calcUT->invoke($svc, '04:30', '20:00', '05:00'), 30);
// 1 hour early — early-morning sector
check('04:00 UT (60 min)',               $calcUT->invoke($svc, '04:00', '20:00', '05:00'), 60);
// Left at 23:30 — evening sector (≥ shiftStart). (1440 + 300) - 1410 = 330
check('23:30 UT evening (330)',          $calcUT->invoke($svc, '23:30', '20:00', '05:00'), 330);
// Left at 21:00 — evening sector. (1440 + 300) - 1260 = 480
check('21:00 UT evening (480)',          $calcUT->invoke($svc, '21:00', '20:00', '05:00'), 480);
// Stayed until 06:00 — after shiftEnd, before shiftStart → no UT
check('06:00 after shiftEnd (no UT)',    $calcUT->invoke($svc, '06:00', '20:00', '05:00'), 0);
// 12:00 noon — clearly between 05:00 and 20:00, no UT
check('12:00 midday (no UT)',            $calcUT->invoke($svc, '12:00', '20:00', '05:00'), 0);

// ── 5. computeNightDiffMinutes — basic ───────────────────────────────────────
echo "\n=== computeNightDiffMinutes (no exclusions) ===\n";
$localTz = 'Asia/Manila';
// 22:00–23:00 Manila = 14:00–15:00 UTC → exactly 60 ND minutes
$ci = Carbon::parse('2026-06-18 14:00:00', 'UTC');
$co = Carbon::parse('2026-06-18 15:00:00', 'UTC');
check('22:00–23:00 → 60 ND mins', $svc->computeNightDiffMinutes($ci, $co, $localTz), 60);

// 21:00–07:00 Manila = 13:00–23:00 UTC → ND window 22:00–06:00 = 8h = 480 mins
$ci2 = Carbon::parse('2026-06-18 13:00:00', 'UTC');
$co2 = Carbon::parse('2026-06-18 23:00:00', 'UTC');
check('21:00–07:00 → 480 ND mins', $svc->computeNightDiffMinutes($ci2, $co2, $localTz), 480);

// ── 6. computeNightDiffMinutes — 20:00–05:00 shift (8 PM – 5 AM) ─────────────
echo "\n=== computeNightDiffMinutes (20:00–05:00 shift, Manila) ===\n";
// 20:00 Manila = 12:00 UTC, 05:00+1 Manila = 21:00 UTC
// ND window 22:00–06:00 Manila = 14:00–22:00 UTC
// Overlap: 14:00–21:00 UTC = 7 hours = 420 ND minutes
$ciShift = Carbon::parse('2026-06-18 12:00:00', 'UTC'); // 20:00 Manila
$coShift = Carbon::parse('2026-06-18 21:00:00', 'UTC'); // 05:00 Manila next day
check('20:00–05:00 full shift → 420 ND mins',
    $svc->computeNightDiffMinutes($ciShift, $coShift, $localTz), 420);

// Same shift with a 1-hour break from 23:00–00:00 Manila = 15:00–16:00 UTC
// That break falls entirely within the ND window → subtract 60 → 360
$brStart = Carbon::parse('2026-06-18 15:00:00', 'UTC'); // 23:00 Manila
$brEnd   = Carbon::parse('2026-06-18 16:00:00', 'UTC'); // 00:00 Manila
check('20:00–05:00 minus 1h ND break → 360 ND mins',
    $svc->computeNightDiffMinutes($ciShift, $coShift, $localTz, [[$brStart, $brEnd]]), 360);

// Break entirely outside ND window (e.g. 20:30–21:30 Manila = 12:30–13:30 UTC)
// ND count should remain 420 (break has 0 overlap with 14:00–22:00 UTC window)
$brOutStart = Carbon::parse('2026-06-18 12:30:00', 'UTC'); // 20:30 Manila
$brOutEnd   = Carbon::parse('2026-06-18 13:30:00', 'UTC'); // 21:30 Manila
check('20:00–05:00 with pre-ND break (no change) → 420 ND mins',
    $svc->computeNightDiffMinutes($ciShift, $coShift, $localTz, [[$brOutStart, $brOutEnd]]), 420);

// ── 7. computeNightDiffPay ────────────────────────────────────────────────────
echo "\n=== computeNightDiffPay ===\n";
// dailyRate=800, 480 ND mins = 8h → 800/8 * 0.10 * 8 = 80
check('800 daily, 480 ND mins → ₱80.00', $svc->computeNightDiffPay(800.0, 480), 80.0);
// 420 ND mins = 7h → 800/8 * 0.10 * 7 = 70
check('800 daily, 420 ND mins → ₱70.00', $svc->computeNightDiffPay(800.0, 420), 70.0);
check('0 ND mins → ₱0.00',               $svc->computeNightDiffPay(800.0, 0),   0.0);

// ── Results ───────────────────────────────────────────────────────────────────
echo "\n=== RESULTS: {$pass} passed, {$fail} failed ===\n";
exit($fail > 0 ? 1 : 0);


// ── 1. toMins ────────────────────────────────────────────────────────────────
echo "\n=== toMins ===\n";
check('00:00 → 0',   $toMins->invoke($svc, '00:00'), 0);
check('08:30 → 510', $toMins->invoke($svc, '08:30'), 510);
check('22:00 → 1320',$toMins->invoke($svc, '22:00'), 1320);
check('23:59 → 1439',$toMins->invoke($svc, '23:59'), 1439);

// ── 2. calcLateMinutes — day shift ───────────────────────────────────────────
echo "\n=== calcLateMinutes (day shift 08:00–17:00) ===\n";
check('On time',         $calcLate->invoke($svc, '08:00', '08:00', '17:00'), 0);
check('15 min late',     $calcLate->invoke($svc, '08:15', '08:00', '17:00'), 15);
check('Early (no late)', $calcLate->invoke($svc, '07:45', '08:00', '17:00'), 0);

// ── 3. calcUndertimeMinutes — day shift ──────────────────────────────────────
echo "\n=== calcUndertimeMinutes (day shift 08:00–17:00) ===\n";
check('Full day (no UT)',   $calcUT->invoke($svc, '17:00', '08:00', '17:00'), 0);
check('30 min early out',  $calcUT->invoke($svc, '16:30', '08:00', '17:00'), 30);
check('Stayed late (no UT)',$calcUT->invoke($svc, '18:00', '08:00', '17:00'), 0);

// ── 4. calcLateMinutes — overnight shift (22:00–06:00) ───────────────────────
echo "\n=== calcLateMinutes (overnight shift 22:00–06:00) ===\n";
// On time in evening sector
check('22:00 on time',           $calcLate->invoke($svc, '22:00', '22:00', '06:00'), 0);
// 30 min late in evening sector
check('22:30 late (30 min)',     $calcLate->invoke($svc, '22:30', '22:00', '06:00'), 30);
// Clock-in at 00:30 (crosses midnight) — the BUG case from QA issue 4
// "00:30" > "22:00" was FALSE with string comparison → 0 late. Should be 150 min.
// Correct: (1440 - 1320) + 30 = 120 + 30 = 150
check('00:30 late overnight (150 min)', $calcLate->invoke($svc, '00:30', '22:00', '06:00'), 150);
// Clock-in at 05:45 (early morning, before shiftEnd 06:00) — late by (1440-1320)+345=465
check('05:45 clock-in late',     $calcLate->invoke($svc, '05:45', '22:00', '06:00'), 465);

// ── 5. calcUndertimeMinutes — overnight shift (22:00–06:00) ──────────────────
echo "\n=== calcUndertimeMinutes (overnight shift 22:00–06:00) ===\n";
// On time in early-morning sector
check('06:00 on time',           $calcUT->invoke($svc, '06:00', '22:00', '06:00'), 0);
// 30 min early clock-out from early-morning sector
// "05:30" < "06:00" = true with string, but "23:30" < "06:00" was FALSE (QA issue 3). Check both.
check('05:30 UT (30 min)',       $calcUT->invoke($svc, '05:30', '22:00', '06:00'), 30);
// "23:30" undertime — BUG case from QA issue 3
// Was: "23:30" < "06:00" → false → 0 UT. Should be (1440 + 360) - 1410 = 390
check('23:30 UT overnight (390 min)', $calcUT->invoke($svc, '23:30', '22:00', '06:00'), 390);
// After end of shift but before start — no UT
check('07:00 (after shiftEnd, no UT)', $calcUT->invoke($svc, '07:00', '22:00', '06:00'), 0);

// ── 6. computeNightDiffMinutes — basic (no exclusions) ───────────────────────
echo "\n=== computeNightDiffMinutes (no exclusions) ===\n";
$localTz = 'Asia/Manila';
// 22:00–23:00 Manila → 14:00–15:00 UTC → exactly 60 ND minutes
$ci = Carbon::parse('2026-06-18 14:00:00', 'UTC');
$co = Carbon::parse('2026-06-18 15:00:00', 'UTC');
check('22:00–23:00 → 60 ND mins', $svc->computeNightDiffMinutes($ci, $co, $localTz), 60);

// 21:00–07:00 Manila → 13:00–23:00 UTC → ND window = 22:00–06:00 = 480 mins
$ci2 = Carbon::parse('2026-06-18 13:00:00', 'UTC');
$co2 = Carbon::parse('2026-06-18 23:00:00', 'UTC');
check('21:00–07:00 → 480 ND mins', $svc->computeNightDiffMinutes($ci2, $co2, $localTz), 480);

// ── 7. computeNightDiffMinutes — with 1-hour exclusion inside ND window ──────
echo "\n=== computeNightDiffMinutes (with break exclusion) ===\n";
// Same 22:00–23:00 shift, but a 30-min break 22:15–22:45
$brStart = Carbon::parse('2026-06-18 14:15:00', 'UTC'); // 22:15 Manila
$brEnd   = Carbon::parse('2026-06-18 14:45:00', 'UTC'); // 22:45 Manila
$ndWithBreak = $svc->computeNightDiffMinutes($ci, $co, $localTz, [[$brStart, $brEnd]]);
check('22:00–23:00 minus 30-min break → 30 ND mins', $ndWithBreak, 30);

// ── 8. computeNightDiffPay ────────────────────────────────────────────────────
echo "\n=== computeNightDiffPay ===\n";
// dailyRate = 800, 480 ND minutes = 8 hours → 800/8 * 0.10 * 8 = 80
check('800 daily, 480 ND mins → ₱80', $svc->computeNightDiffPay(800.0, 480), 80.0);
check('0 ND mins → ₱0',               $svc->computeNightDiffPay(800.0, 0),   0.0);

// ── Results ───────────────────────────────────────────────────────────────────
echo "\n=== RESULTS: {$pass} passed, {$fail} failed ===\n";
exit($fail > 0 ? 1 : 0);
