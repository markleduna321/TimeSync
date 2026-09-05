<?php
/**
 * Phase 2 QA Smoke Test — run with: php scripts/smoke-test-phase2.php
 * All data is created inside a transaction and rolled back. Nothing persists.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AttendanceCorrection;
use App\Models\Holiday;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use App\Models\UserPaySetting;
use App\Services\PayslipComputationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$pass = 0; $fail = 0;
$check = function (string $label, bool $ok, string $detail = '') use (&$pass, &$fail) {
    if ($ok) { $pass++; echo "  PASS  {$label}\n"; }
    else     { $fail++; echo "  FAIL  {$label}" . ($detail ? " -- {$detail}" : '') . "\n"; }
};

DB::beginTransaction();

try {
    $svc   = app(PayslipComputationService::class);
    $start = Carbon::parse('2026-08-01');
    $end   = Carbon::parse('2026-08-15');
    // Local Asia/Manila = UTC+8. 08:00 local = 00:00 UTC same date.

    echo "== 1. User creation + schedule assignment ==\n";

    $u1 = User::create(['first_name' => 'Smoke', 'last_name' => 'Standard', 'email' => 'smoke.standard@test.local', 'password' => bcrypt('secret123'), 'monthly_salary' => 30000]);
    $u2 = User::create(['first_name' => 'Smoke', 'last_name' => 'Flexi',    'email' => 'smoke.flexi@test.local',    'password' => bcrypt('secret123'), 'monthly_salary' => 30000]);
    $u3 = User::create(['first_name' => 'Smoke', 'last_name' => 'Night',    'email' => 'smoke.night@test.local',    'password' => bcrypt('secret123'), 'monthly_salary' => 30000]);
    $check('3 test users created', $u1->id && $u2->id && $u3->id);

    $s1 = Schedule::create(['user_id' => $u1->id, 'work_days' => ['Mon','Tue','Wed','Thu','Fri'], 'shift_start' => '08:00', 'shift_end' => '17:00', 'schedule_type' => 'standard']);
    $check('Standard schedule 08:00-17:00 saved', $s1->exists && $s1->schedule_type === 'standard');

    $s2 = Schedule::create(['user_id' => $u2->id, 'work_days' => ['Mon','Tue','Wed','Thu','Fri'], 'shift_start' => null, 'shift_end' => null, 'schedule_type' => 'flexi']);
    $check('Flexi schedule with NULL shift times saved (nullable fix)', $s2->exists && $s2->shift_start === null);

    $s3 = Schedule::create(['user_id' => $u3->id, 'work_days' => ['Mon','Tue','Wed','Thu','Fri'], 'shift_start' => '22:00', 'shift_end' => '06:00', 'schedule_type' => 'standard']);
    $check('Overnight schedule 22:00-06:00 saved', $s3->exists);

    $r1 = (new \App\Http\Resources\ScheduleResource($s2))->toArray(new Request());
    $check("ScheduleResource exposes schedule_type='flexi'", ($r1['schedule_type'] ?? null) === 'flexi');

    echo "\n== 2. Standard user: time scenarios ==\n";
    // Aug 2026: 3=Mon 4=Tue 5=Wed 6=Thu 7=Fri 8=Sat 10=Mon 11=Tue 12=Wed 13=Thu 14=Fri
    $mk = fn ($uid, $date, $in, $out, $extra = []) => TimeLog::create(array_merge([
        'user_id' => $uid, 'date' => $date, 'clock_in' => $in, 'clock_out' => $out, 'status' => 'clocked_out',
    ], $extra));

    $mk($u1->id, '2026-08-03', '2026-08-03 00:00:00', '2026-08-03 09:00:00');                                  // on-time
    $mk($u1->id, '2026-08-04', '2026-08-04 00:30:00', '2026-08-04 09:00:00');                                  // 30m late
    $mk($u1->id, '2026-08-05', '2026-08-05 00:00:00', '2026-08-05 08:00:00');                                  // 60m undertime
    $mk($u1->id, '2026-08-06', '2026-08-06 00:00:00', '2026-08-06 11:00:00', ['overtime_minutes' => 120]);     // approved OT 2h
    $mk($u1->id, '2026-08-07', '2026-08-07 01:00:00', '2026-08-07 10:00:00', [                                 // correction: shift moved to 09:00-18:00, worked full shift
        'effective_shift_start' => '09:00', 'effective_shift_end' => '18:00',
    ]);
    AttendanceCorrection::create([
        'user_id' => $u1->id, 'date' => '2026-08-07', 'type' => 'correction', 'status' => 'approved',
        'reason' => 'Smoke: approved shift-change correction',
        'effective_shift_start' => '09:00', 'effective_shift_end' => '18:00',
    ]);
    $mk($u1->id, '2026-08-08', '2026-08-08 00:00:00', '2026-08-08 04:00:00', ['overtime_minutes' => 240]);     // RDOT: Saturday, approved 4h OT
    $mk($u1->id, '2026-08-10', '2026-08-10 00:00:00', '2026-08-10 09:00:00');
    $mk($u1->id, '2026-08-11', '2026-08-11 00:00:00', '2026-08-11 09:00:00');
    $mk($u1->id, '2026-08-12', '2026-08-12 00:00:00', '2026-08-12 09:00:00', ['overtime_minutes' => 60]);     // regular holiday, worked + 1h approved OT
    $mk($u1->id, '2026-08-13', '2026-08-13 00:00:00', '2026-08-13 09:00:00');
    $mk($u1->id, '2026-08-14', '2026-08-14 00:00:00', '2026-08-14 09:00:00');

    Holiday::create(['date' => '2026-08-12', 'name' => 'Smoke Regular Holiday', 'type' => 'regular']);

    $p1 = $svc->compute($u1, $start->copy(), $end->copy());
    $sum = $p1['summary'];
    $codes = collect($p1['earnings'])->pluck('amount', 'code');

    $check('Late = 30 min (only Aug 4; correction day not late)', ($sum['late_minutes'] ?? -1) == 30, "got {$sum['late_minutes']}");
    $check('Undertime = 60 min (Aug 5 only)', ($sum['undertime_minutes'] ?? -1) == 60, "got {$sum['undertime_minutes']}");
    $check('OVERTIME earnings line present (approved 120m OT)', isset($codes['OVERTIME']) && $codes['OVERTIME'] > 0, json_encode($codes));
    $check('RDOT earnings line present (Sat + approved 240m OT)', isset($codes['RDOT']) && $codes['RDOT'] > 0);
    $check('HOLIDAY_PAY line present (worked regular holiday)', isset($codes['HOLIDAY_PAY']) && $codes['HOLIDAY_PAY'] > 0);
    $check('Holiday days worked = 1', ($sum['holiday_days_worked'] ?? 0) == 1);
    $check('No schedule warnings for configured user', empty($p1['warnings']));

    echo "\n== 3. Flexi user: no late / no undertime ==\n";
    $mk($u2->id, '2026-08-03', '2026-08-03 02:23:00', '2026-08-03 11:23:00');  // 10:23-19:23 local
    $mk($u2->id, '2026-08-04', '2026-08-03 22:15:00', '2026-08-04 07:00:00');  // 06:15-15:00 local

    $p2 = $svc->compute($u2, $start->copy(), $end->copy());
    $check('Flexi: late = 0 despite 10:23 clock-in', ($p2['summary']['late_minutes'] ?? -1) == 0, "got {$p2['summary']['late_minutes']}");
    $check('Flexi: undertime = 0 despite early clock-out', ($p2['summary']['undertime_minutes'] ?? -1) == 0);
    $check('Flexi: days worked counted normally', ($p2['summary']['days_worked'] ?? 0) >= 2, "got " . ($p2['summary']['days_worked'] ?? 'n/a'));

    echo "\n== 4. Attendance calendar: flexi = present, never late ==\n";
    try {
        auth()->login($u2);
        $req = Request::create('/api/attendance', 'GET', ['month' => '2026-08', 'user_id' => $u2->id]);
        $days = collect(app(\App\Http\Controllers\Api\AttendanceController::class)->calendar($req)->resource);
        $aug3 = collect($days)->first(fn ($d) => ($d['date'] ?? '') === '2026-08-03');
        $check("Calendar Aug 3 status = 'present' (not 'late')", ($aug3['status'] ?? '') === 'present', "got '" . ($aug3['status'] ?? 'n/a') . "'");
        $check('Calendar Aug 3 late_minutes = 0', ($aug3['late_minutes'] ?? -1) == 0);
        auth()->logout();
    } catch (\Throwable $e) {
        $check('Attendance calendar flexi check', false, get_class($e) . ': ' . $e->getMessage());
    }

    echo "\n== 5. Night differential + toggle ==\n";
    // 22:00 local Aug 3 = 14:00 UTC; 06:00 local Aug 4 = 22:00 UTC Aug 3
    $mk($u3->id, '2026-08-03', '2026-08-03 14:00:00', '2026-08-03 22:00:00');

    $p3 = $svc->compute($u3, $start->copy(), $end->copy());
    $codes3 = collect($p3['earnings'])->pluck('amount', 'code');
    $check('NIGHT_DIFF line present for 22:00-06:00 shift', isset($codes3['NIGHT_DIFF']) && $codes3['NIGHT_DIFF'] > 0, json_encode($codes3));

    UserPaySetting::create(['user_id' => $u3->id, 'code' => 'NIGHT_DIFF', 'is_enabled' => false]);
    $p3b = $svc->compute($u3, $start->copy(), $end->copy());
    $codes3b = collect($p3b['earnings'])->pluck('amount', 'code');
    $check('NIGHT_DIFF line removed after toggle OFF', !isset($codes3b['NIGHT_DIFF']));
    $check('nd_minutes = 0 in summary after toggle OFF', ($p3b['summary']['nd_minutes'] ?? -1) == 0, "got " . ($p3b['summary']['nd_minutes'] ?? 'n/a'));
    $check('Basic pay unaffected by toggle', ($codes3['BASIC'] ?? 0) == ($codes3b['BASIC'] ?? -1));

    echo "\n== 6. Holiday pay toggle ==\n";
    UserPaySetting::create(['user_id' => $u1->id, 'code' => 'HOLIDAY_PAY', 'is_enabled' => false]);
    $p1b = $svc->compute($u1, $start->copy(), $end->copy());
    $codes1b = collect($p1b['earnings'])->pluck('amount', 'code');
    $check('HOLIDAY_PAY line removed after toggle OFF', !isset($codes1b['HOLIDAY_PAY']));
    $check('holiday_days_worked = 0 in summary after toggle OFF', ($p1b['summary']['holiday_days_worked'] ?? -1) == 0, "got " . ($p1b['summary']['holiday_days_worked'] ?? 'n/a'));
    $check('holiday_days = 0 in summary after toggle OFF', ($p1b['summary']['holiday_days'] ?? -1) == 0);

    // OT on the holiday must drop to the plain 1.25 rate when holiday pay is off
    $dr = $p1b['summary']['daily_rate'];
    $expectedPlainOt = $svc->computeOvertimePay($dr, 120, false) + $svc->computeOvertimePay($dr, 60, false);
    $check('Holiday OT reverts to plain 1.25 rate when toggled OFF', abs(($codes1b['OVERTIME'] ?? 0) - $expectedPlainOt) < 0.02, "got {$codes1b['OVERTIME']}, expected {$expectedPlainOt}");
    $check('OT was higher when holiday pay was enabled', ($codes['OVERTIME'] ?? 0) > ($codes1b['OVERTIME'] ?? 0), "enabled={$codes['OVERTIME']}, disabled={$codes1b['OVERTIME']}");
    $check('OVERTIME still present (unaffected by holiday toggle)', isset($codes1b['OVERTIME']));
    $check('RDOT still present (unaffected by holiday toggle)', isset($codes1b['RDOT']));

    echo "\n== 7. Pay settings API controller ==\n";
    $ctl = app(\App\Http\Controllers\Api\UserPaySettingController::class);
    try {
        auth()->login($u1); // authorize('update', $user) — self-update policy may deny; catch either way
        $res = $ctl->index($u3);
        $data = collect(json_decode($res->getContent(), true)['data']);
        $nd = $data->firstWhere('code', 'NIGHT_DIFF');
        $check('index(): NIGHT_DIFF reflects DB toggle (false)', ($nd['is_enabled'] ?? true) === false);
        $check('index(): HOLIDAY_PAY defaults true when no row', ($data->firstWhere('code', 'HOLIDAY_PAY')['is_enabled'] ?? false) === true);
        auth()->logout();
    } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
        echo "  INFO  Controller authorize denied for non-admin (policy working) — verified via model instead\n";
        $nd = UserPaySetting::where('user_id', $u3->id)->where('code', 'NIGHT_DIFF')->first();
        $check('NIGHT_DIFF toggle persisted in DB', $nd && $nd->is_enabled === false);
    }

    echo "\n== 8. Correction with lunch + breaks (approval applies to time log) ==\n";
    try {
        // Original log: 09:00-15:00 local, no lunch, no breaks
        $origLog = $mk($u2->id, '2026-08-05', '2026-08-05 01:00:00', '2026-08-05 07:00:00');

        $corr = AttendanceCorrection::create([
            'user_id'               => $u2->id,
            'date'                  => '2026-08-05',
            'type'                  => 'correction',
            'reason'                => 'Smoke: forgot to log lunch and breaks',
            'requested_clock_in'    => '08:00',
            'requested_clock_out'   => '17:00',
            'requested_lunch_start' => '12:00',
            'requested_lunch_end'   => '13:00',
            'requested_breaks'      => [
                ['start' => '10:00', 'end' => '10:15'],
                ['start' => '15:30', 'end' => '15:45'],
            ],
            'status'                => 'pending',
        ]);

        \Illuminate\Support\Facades\Gate::before(fn () => true); // policy bypass for smoke only
        auth()->login($u1);
        $req = \App\Http\Requests\ReviewAttendanceCorrectionRequest::create(
            "/api/attendance/corrections/{$corr->id}", 'PATCH', ['action' => 'approved']
        );
        $req->setContainer(app())->setRedirector(app('redirect'));
        $req->setUserResolver(fn () => $u1);
        $req->validateResolved();
        app(\App\Http\Controllers\Api\AttendanceCorrectionController::class)->review($req, $corr);
        auth()->logout();

        $log = TimeLog::where('user_id', $u2->id)->where('date', '2026-08-05')->first();
        // 08:00 local = 00:00 UTC; 12:00 local = 04:00 UTC; break 10:00 local = 02:00 UTC
        $check('Clock in applied (08:00 local = 00:00 UTC)', $log?->getRawOriginal('clock_in') === '2026-08-05 00:00:00', "got " . $log?->getRawOriginal('clock_in'));
        $check('Clock out applied (17:00 local = 09:00 UTC)', $log?->getRawOriginal('clock_out') === '2026-08-05 09:00:00', "got " . $log?->getRawOriginal('clock_out'));
        $check('Lunch start applied (12:00 local = 04:00 UTC)', $log?->getRawOriginal('lunch_start') === '2026-08-05 04:00:00', "got " . $log?->getRawOriginal('lunch_start'));
        $check('Lunch end applied (13:00 local = 05:00 UTC)', $log?->getRawOriginal('lunch_end') === '2026-08-05 05:00:00', "got " . $log?->getRawOriginal('lunch_end'));
        $breaks = $log?->breaks ?? [];
        $check('2 breaks applied to time log', count($breaks) === 2, "got " . count($breaks));
        $b1ok = isset($breaks[0]['start']) && str_contains($breaks[0]['start'], '02:00:00') && str_contains($breaks[0]['end'] ?? '', '02:15:00');
        $check('Break 1 converted to UTC (10:00-10:15 local = 02:00-02:15 UTC)', $b1ok, json_encode($breaks[0] ?? null));
        $check('Correction status = approved', $corr->fresh()->status === 'approved');
    } catch (\Throwable $e) {
        $check('Correction lunch/breaks approval flow', false, get_class($e) . ': ' . $e->getMessage());
    }

} catch (\Throwable $e) {
    $fail++;
    echo "  FATAL  " . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine() . "\n";
} finally {
    DB::rollBack();
    // Belt-and-braces: remove smoke artifacts if the rollback did not cover them.
    User::whereIn('email', ['smoke.standard@test.local', 'smoke.flexi@test.local', 'smoke.night@test.local'])->delete();
    Holiday::where('name', 'Smoke Regular Holiday')->delete();
    echo "\n== Rolled back / cleaned all test data ==\n";
    echo "RESULT: {$pass} passed, {$fail} failed\n";
}

exit($fail > 0 ? 1 : 0);
