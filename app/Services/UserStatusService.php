<?php

namespace App\Services;

use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use App\Models\UserBreakConfig;
use Carbon\Carbon;

/**
 * Centralised logic for computing a user's "current status" — used by the
 * Admin → Users table. Mirrors the rules used in AttendanceController so the
 * dashboard view, the attendance calendar, and the live status pill stay
 * consistent.
 *
 * Output shape (one block per user):
 *   [
 *       'state'        => 'clocked_in|on_break|on_lunch|clocked_out|not_clocked_in|on_leave|holiday|off',
 *       'clock_in_at'  => '...ISO8601...' | null,
 *       'clock_out_at' => '...ISO8601...' | null,
 *       'labels'       => [['key' => 'late', 'label' => 'Late'], ...],
 *   ]
 */
class UserStatusService
{
    /**
     * Resolve the live status for a user on `now`.
     */
    public static function resolve(
        User $user,
        ?TimeLog $log = null,
        ?Schedule $schedule = null,
        ?UserBreakConfig $breakConfig = null,
        ?LeaveApplication $leave = null,
        ?Holiday $holiday = null,
        ?Carbon $now = null
    ): array {
        $now      = $now ?? Carbon::now();
        $todayStr = $now->toDateString();

        // 1. Holiday beats everything when no work was done
        if ($holiday && ! ($log && $log->clock_in)) {
            return self::shape('holiday', null, null, []);
        }

        // 2. Approved leave beats "not clocked in"
        if ($leave && $leave->status === 'approved') {
            return self::shape('on_leave', null, null, []);
        }

        // 3. Rest day — not a configured work day
        $workDays = $schedule?->work_days ?? [];
        if (! self::isWorkDay($now, $workDays)) {
            return self::shape('off', null, null, []);
        }

        $shiftStart = $schedule?->shift_start; // "08:00"
        $labels     = [];

        // 4. No log today
        if (! $log || ! $log->clock_in) {
            $late = $shiftStart && $now->gt(self::parseShiftTime($todayStr, $shiftStart));
            if ($late) {
                $labels[] = ['key' => 'late', 'label' => 'Late'];
            }
            return self::shape('not_clocked_in', null, null, $labels);
        }

        // 5. Late — clocked in past shift start (any state)
        if ($shiftStart) {
            $shiftStartCarbon = self::parseShiftTime($log->date->toDateString(), $shiftStart);
            if ($log->clock_in->gt($shiftStartCarbon)) {
                $labels[] = ['key' => 'late', 'label' => 'Late'];
            }
        }

        $clockInAt  = $log->clock_in?->toISOString();
        $clockOutAt = $log->clock_out?->toISOString();

        // 6. Resolve active state — order matters
        $state = $log->status;
        if ($state === 'on_lunch') {
            return self::resolveLunch($log, $breakConfig, $clockInAt, $clockOutAt, $now, $labels);
        }
        if ($state === 'on_break') {
            return self::resolveBreak($log, $breakConfig, $clockInAt, $clockOutAt, $now, $labels);
        }
        if ($state === 'clocked_out') {
            return self::shape('clocked_out', $clockInAt, $clockOutAt, $labels);
        }
        return self::shape('clocked_in', $clockInAt, $clockOutAt, $labels);
    }

    /* ── Helpers ─────────────────────────────────────────── */

    private static function resolveLunch(
        TimeLog $log,
        ?UserBreakConfig $cfg,
        ?string $clockInAt,
        ?string $clockOutAt,
        Carbon $now,
        array $labels
    ): array {
        if ($log->lunch_start && $cfg) {
            $allowed  = (int) $cfg->lunch_duration_minutes;
            $elapsed  = (int) $log->lunch_start->diffInMinutes($now);
            if ($elapsed > $allowed) {
                $labels[] = [
                    'key'   => 'over_lunch',
                    'label' => 'Over Lunch',
                    'extra' => ($elapsed - $allowed) . 'm',
                ];
            }
        }
        return self::shape('on_lunch', $clockInAt, $clockOutAt, $labels);
    }

    private static function resolveBreak(
        TimeLog $log,
        ?UserBreakConfig $cfg,
        ?string $clockInAt,
        ?string $clockOutAt,
        Carbon $now,
        array $labels
    ): array {
        $breaks     = $log->breaks ?? [];
        $active     = collect($breaks)->first(fn ($b) => ! empty($b['start']) && empty($b['end']));
        if ($active && $cfg) {
            $allowed  = (int) $cfg->break_duration_minutes;
            $elapsed  = (int) Carbon::parse($active['start'])->diffInMinutes($now);
            if ($elapsed > $allowed) {
                $labels[] = [
                    'key'   => 'over_break',
                    'label' => 'Over Break',
                    'extra' => ($elapsed - $allowed) . 'm',
                ];
            }
        }
        return self::shape('on_break', $clockInAt, $clockOutAt, $labels);
    }

    private static function shape(string $state, ?string $clockInAt, ?string $clockOutAt, array $labels): array
    {
        return [
            'state'        => $state,
            'clock_in_at'  => $clockInAt,
            'clock_out_at' => $clockOutAt,
            'labels'       => $labels,
        ];
    }

    private static function isWorkDay(Carbon $date, array $workDays): bool
    {
        if (empty($workDays)) {
            return true; // no schedule = always a work day
        }
        return in_array($date->format('D'), $workDays, true)
            || in_array(strtolower($date->englishDayOfWeek), $workDays, true);
    }

    private static function parseShiftTime(string $date, string $time): Carbon
    {
        return Carbon::parse($date . ' ' . $time);
    }
}
