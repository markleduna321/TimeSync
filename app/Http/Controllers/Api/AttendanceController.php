<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceDayResource;
use App\Models\AttendanceCorrection;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceController extends Controller
{
    /**
     * Return a flat array of day objects for every calendar day in a given month.
     * Each day carries a computed status and any associated correction.
     *
     * GET /api/attendance?month=YYYY-MM&user_id=X
     */
    public function calendar(Request $request): AnonymousResourceCollection
    {
        $targetId = (int) $request->query('user_id', auth()->id());
        $target   = User::with(['schedule', 'breakConfig'])->findOrFail($targetId);

        $this->authorize('viewTimesheet', $target); // reuse same cross-user policy

        $month = $request->query('month', now()->format('Y-m'));

        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
            $end   = Carbon::createFromFormat('Y-m', $month)->endOfMonth();
        } catch (\Exception) {
            $start = now()->startOfMonth();
            $end   = now()->endOfMonth();
        }

        // Eager-load logs and corrections for the month in 2 queries
        $logs = TimeLog::where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($l) => $l->date->format('Y-m-d'));

        $corrections = AttendanceCorrection::with('history.changedBy')
            ->where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($c) => $c->date->format('Y-m-d') . '_' . $c->type);

        // Holidays declared for this month
        $holidayMap = Holiday::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($h) => $h->date->format('Y-m-d'));

        // Load leave applications covering any day in this month.
        $leaveApplications = LeaveApplication::with('leaveType')
            ->where('user_id', $target->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('end_date', [$start->toDateString(), $end->toDateString()]);
            })
            ->get();

        $schedule   = $target->schedule;
        $workDays   = $schedule?->work_days ?? []; // ['Mon', 'Tue', ...] or ['monday', ...]
        $shiftStart = $schedule?->shift_start;     // "08:00"
        $shiftEnd   = $schedule?->shift_end;       // "17:00"
        $today      = now()->toDateString();

        // Break config for over-break computation
        $breakConfig      = $target->breakConfig;
        $allowedBreakMins = $breakConfig
            ? ($breakConfig->break_count * $breakConfig->break_duration_minutes)
            : 0;
        $allowedLunchMins = $breakConfig ? $breakConfig->lunch_duration_minutes : 60;

        $days = [];
        $cursor = $start->copy();

        while ($cursor <= $end) {
            $dateStr    = $cursor->toDateString();
            // Support both storage formats: 'Mon' (UI) and 'monday' (seeder)
            $isWorkDay  = in_array($cursor->format('D'), $workDays)
                       || in_array(strtolower($cursor->englishDayOfWeek), $workDays);
            $isFuture   = $dateStr > $today;
            $log              = $logs[$dateStr] ?? null;
            $clockInRaw       = $log?->getRawOriginal('clock_in');
            $clockOutRaw      = $log?->getRawOriginal('clock_out');
            $correction       = $corrections["{$dateStr}_correction"] ?? null;
            $overtime         = $corrections["{$dateStr}_overtime"]   ?? null;
            $undertimeMinutes = 0;
            $holiday          = $holidayMap[$dateStr] ?? null;

            // Find a leave application that covers this specific date.
            $leave = $leaveApplications->first(function ($app) use ($dateStr) {
                return $app->start_date->format('Y-m-d') <= $dateStr
                    && $app->end_date->format('Y-m-d')   >= $dateStr;
            });

            if ($isFuture) {
                $status = 'upcoming';
            } elseif ($holiday && (!$log || !$log->clock_in)) {
                // Declared holiday and employee did not work — never show as absent
                $status = 'holiday';
            } elseif (! $isWorkDay) {
                $status = 'rest_day';
            } elseif ($leave && $leave->status === 'approved') {
                $status = 'on_leave';
            } elseif (! $log || ! $log->clock_in) {
                $status = 'absent';
            } else {
                $clockInTime  = $clockInRaw  ? substr($clockInRaw,  11, 5) : null; // "08:05"
                $clockOutTime = $clockOutRaw ? substr($clockOutRaw, 11, 5) : null; // "17:02"

                // Late: simple string comparison works perfectly for HH:MM
                $status = 'present';
                if ($shiftStart && $clockInTime && $clockInTime > $shiftStart) {
                    $status = 'late';
                }

                // Undertime: convert both times to total minutes, then subtract
                if ($shiftEnd && $clockOutTime && $clockOutTime < $shiftEnd) {
                    [$sh, $sm] = explode(':', $shiftEnd);
                    [$ch, $cm] = explode(':', $clockOutTime);
                    $undertimeMinutes = (((int)$sh * 60) + (int)$sm) - (((int)$ch * 60) + (int)$cm);
                }
            }

            // Over break — actual break/lunch vs configured allowances
            $overBreakMinutes = 0;
            if ($log && $breakConfig) {
                // Regular breaks — only tracked when breaks are enabled
                if ($breakConfig->break_allowed) {
                    $actualBreakMins = 0;
                    foreach ($log->breaks ?? [] as $break) {
                        if (! empty($break['start']) && ! empty($break['end'])) {
                            $actualBreakMins += (int) Carbon::parse($break['start'])->diffInMinutes(Carbon::parse($break['end']));
                        }
                    }
                    $overBreakMinutes += max(0, $actualBreakMins - $allowedBreakMins);
                }

                // Lunch — always tracked regardless of break_allowed
                if ($log->lunch_start && $log->lunch_end) {
                    $actualLunchMins = (int) $log->lunch_start->diffInMinutes($log->lunch_end);
                    $overBreakMinutes += max(0, $actualLunchMins - $allowedLunchMins);
                }
            }

            $days[] = [
                'date'                 => $dateStr,
                'day_of_week'          => $cursor->englishDayOfWeek,
                'status'               => $status,
                'clock_in'             => $log?->clock_in?->toISOString(),
                'clock_out'            => $log?->clock_out?->toISOString(),
                'clock_in_time'        => $clockInRaw ? substr($clockInRaw, 11, 8) : null,
                'clock_out_time'       => $clockOutRaw ? substr($clockOutRaw, 11, 8) : null,
                'lunch_start'          => $log?->lunch_start?->toISOString(),
                'lunch_end'            => $log?->lunch_end?->toISOString(),
                'lunch_start_time'     => $log?->getRawOriginal('lunch_start') ? substr($log->getRawOriginal('lunch_start'), 11, 8) : null,
                'lunch_end_time'       => $log?->getRawOriginal('lunch_end')   ? substr($log->getRawOriginal('lunch_end'),   11, 8) : null,
                'breaks'               => $log?->breaks ?? [],
                'total_worked_minutes' => $log?->total_worked_minutes,
                'undertime_minutes'    => $undertimeMinutes,
                'over_break_minutes'   => $overBreakMinutes,
                'correction'           => $correction,
                'overtime'             => $overtime,
                'leave'                => $leave,
                'holiday'              => $holiday ? [
                    'id'   => $holiday->id,
                    'name' => $holiday->name,
                    'type' => $holiday->type,
                ] : null,
            ];

            $cursor->addDay();
        }

        return AttendanceDayResource::collection(collect($days));
    }
}
