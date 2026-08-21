<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceDayResource;
use App\Models\AttendanceCorrection;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Schedule;
use App\Models\ScheduleOverride;
use App\Models\TimeLog;
use App\Models\TrainingEntry;
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

        // Helper: safely get a YYYY-MM-DD string whether the model casts `date`
        // as a Carbon instance or leaves it as a plain string.
        $toDateStr = fn ($val) => $val instanceof \Carbon\Carbon
            ? $val->format('Y-m-d')
            : substr((string) $val, 0, 10);

        // Eager-load logs and corrections for the month in 2 queries
        $logs = TimeLog::where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($l) => $toDateStr($l->date));

        $corrections = AttendanceCorrection::with('history.changedBy')
            ->where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($c) => $toDateStr($c->date) . '_' . $c->type);

        // Soft-deleted (removed) corrections — keyed by date_type, each entry is an array of records.
        // history.changedBy is eager-loaded so approved removals can show the time-log diff in the UI.
        $removedCorrectionMap = AttendanceCorrection::withTrashed()
            ->whereNotNull('deleted_at')
            ->with(['deletedBy', 'history.changedBy'])
            ->where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->groupBy(fn ($c) => $toDateStr($c->date) . '_' . $c->type)
            ->map(fn ($group) => $group->map(fn ($c) => [
                'id'                  => $c->id,
                'type'                => $c->type,
                'status'              => $c->status,
                'reason'              => $c->reason,
                'requested_clock_in'  => $c->requested_clock_in,
                'requested_clock_out' => $c->requested_clock_out,
                'created_at'          => $c->created_at?->toISOString(),
                'deleted_at'          => $c->deleted_at?->toISOString(),
                'deleted_reason'      => $c->deleted_reason,
                'deleted_by_name'     => $c->deletedBy?->name,
                'history'             => $c->history->map(fn ($h) => [
                    'old_clock_in'  => $h->old_clock_in?->toISOString(),
                    'old_clock_out' => $h->old_clock_out?->toISOString(),
                    'new_clock_in'  => $h->new_clock_in?->toISOString(),
                    'new_clock_out' => $h->new_clock_out?->toISOString(),
                    'changed_by'    => $h->changedBy?->name,
                    'changed_at'    => $h->changed_at?->toISOString(),
                ])->all(),
            ])->values()->all());

        // Holidays declared for this month
        $holidayMap = Holiday::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($h) => $toDateStr($h->date));

        // Load leave applications covering any day in this month.
        $leaveApplications = LeaveApplication::with('leaveType')
            ->where('user_id', $target->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('end_date', [$start->toDateString(), $end->toDateString()]);
            })
            ->get();

        // Schedule overrides — admin-set prospective shift overrides for specific dates.
        $overrideMap = ScheduleOverride::where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($o) => $toDateStr($o->date));

        // Training entries for this month.
        $trainingMap = TrainingEntry::where('user_id', $target->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($t) => $toDateStr($t->date));

        $schedule   = $target->schedule;
        $workDays   = $schedule?->work_days ?? []; // ['Mon', 'Tue', ...] or ['monday', ...]
        $isFlexi    = $schedule?->schedule_type === 'flexi';
        // Normalize to HH:MM — DB may store as "13:00:00" (with seconds)
        $shiftStart = $schedule?->shift_start ? substr($schedule->shift_start, 0, 5) : null;
        $shiftEnd   = $schedule?->shift_end   ? substr($schedule->shift_end,   0, 5) : null;
        // Normalize keys to 3-letter title-case so 'monday', 'MON', and 'Mon' all resolve correctly
        $timeByDay  = collect($schedule?->time_by_day ?? [])
            ->mapWithKeys(fn ($v, $k) => [ucfirst(substr(strtolower($k), 0, 3)) => $v])
            ->all();
        // Timestamps are stored as UTC in the DB. The local timezone for comparison
        // against schedule times must be the business timezone, not the app timezone
        // (which is kept as UTC so that ISO strings sent to the frontend are correct).
        $localTz = env('APP_LOCAL_TIMEZONE', 'Asia/Manila');
        $today   = now($localTz)->toDateString();

        // Break config for over-break computation
        $breakConfig      = $target->breakConfig;
        $allowedBreakMins = $breakConfig
            ? ($breakConfig->break_count * $breakConfig->break_duration_minutes)
            : 0;
        $allowedLunchMins = $breakConfig ? $breakConfig->lunch_duration_minutes : 60;

        // Overnight-safe late/undertime helpers (mirrors PayslipComputationService logic).
        $toMins = function (string $hhmm): int {
            $parts = explode(':', $hhmm);
            if (count($parts) < 2 || ! is_numeric($parts[0]) || ! is_numeric($parts[1])) {
                return 0;
            }
            return (int)$parts[0] * 60 + (int)$parts[1];
        };

        $calcLate = function(string $ci, string $ss, string $se) use ($toMins): int {
            $ciM = $toMins($ci); $ssM = $toMins($ss); $seM = $toMins($se);
            if ($seM >= $ssM) return max(0, $ciM - $ssM);          // day shift
            if ($ciM >= $ssM) return max(0, $ciM - $ssM);          // overnight: evening sector
            if ($ciM < $seM)  return (1440 - $ssM) + $ciM;         // overnight: early-morning sector
            return 0;                                               // dead zone: arrived early, no late
        };

        $calcUT = function(string $co, string $ss, string $se) use ($toMins): int {
            $coM = $toMins($co); $ssM = $toMins($ss); $seM = $toMins($se);
            if ($seM >= $ssM) return max(0, $seM - $coM);          // day shift
            if ($coM < $seM)  return $seM - $coM;                  // overnight: early-morning, before shiftEnd
            if ($coM >= $ssM) return (1440 + $seM) - $coM;         // overnight: evening, before midnight
            return 0;                                               // after shiftEnd, before shiftStart = no UT
        };

        $days = [];
        $cursor = $start->copy();

        while ($cursor <= $end) {
            $dateStr    = $cursor->toDateString();
            // Support both storage formats: 'Mon' (UI) and 'monday' (seeder)
            $isWorkDay  = in_array($cursor->format('D'), $workDays)
                       || in_array(strtolower($cursor->englishDayOfWeek), $workDays);
            $dayKey = $cursor->format('D');
            $dayTimeOverride = $timeByDay[$dayKey] ?? null;
            $dayShiftStart = $dayTimeOverride['shift_start'] ?? $shiftStart;
            $dayShiftEnd   = $dayTimeOverride['shift_end'] ?? $shiftEnd;
            $isFuture   = $dateStr > $today;
            $log              = $logs[$dateStr] ?? null;
            $clockInRaw       = $log?->getRawOriginal('clock_in');   // "2026-05-10 08:05:00"
            $clockOutRaw      = $log?->getRawOriginal('clock_out');  // "2026-05-10 17:02:00"
            $correction       = $corrections["{$dateStr}_correction"] ?? null;
            $overtime         = $corrections["{$dateStr}_overtime"]   ?? null;
            $removedCorr      = $removedCorrectionMap["{$dateStr}_correction"] ?? null;
            $removedOt        = $removedCorrectionMap["{$dateStr}_overtime"]   ?? null;
            $undertimeMinutes = 0;
            $lateMinutes      = 0;
            $holiday          = $holidayMap[$dateStr] ?? null;
            $override         = $overrideMap[$dateStr] ?? null;
            $training         = $trainingMap[$dateStr] ?? null;

            // Apply day-status overrides from admin actions.
            if ($override?->demotes_to_restday) {
                $isWorkDay = false;
            } elseif ($override?->promotes_to_workday) {
                $isWorkDay = true;
            }

            // Find a leave application that covers this specific date.
            $leave = $leaveApplications->first(function ($app) use ($dateStr) {
                return $app->start_date->format('Y-m-d') <= $dateStr
                    && $app->end_date->format('Y-m-d')   >= $dateStr;
            });

            if ($isFuture) {
                $status = 'upcoming';
            } elseif ($holiday && (!$log || !$log->clock_in)) {
                $status = 'holiday';
            } elseif (! $isWorkDay) {
                $status = 'rest_day';
            } elseif ($leave && $leave->status === 'approved') {
                $status = 'on_leave';
            } elseif ($training && $isWorkDay) {
                $status = 'training';
            } elseif (! $log || ! $log->clock_in) {
                $status = 'absent';
            } else {
                // Parse raw UTC strings and convert to local business timezone
                // for comparison against shift_start / shift_end (which are local times).
                $clockInTime  = $clockInRaw  ? Carbon::parse($clockInRaw,  'UTC')->setTimezone($localTz)->format('H:i') : null;
                $clockOutTime = $clockOutRaw ? Carbon::parse($clockOutRaw, 'UTC')->setTimezone($localTz)->format('H:i') : null;

                // Per-day effective shift overrides (set by admin when approving a correction).
                $dayShiftStart = $log->effective_shift_start
                    ? substr($log->effective_shift_start, 0, 5)
                    : ($override?->shift_start ? substr($override->shift_start, 0, 5) : $dayShiftStart);
                $dayShiftEnd   = $log->effective_shift_end
                    ? substr($log->effective_shift_end,   0, 5)
                    : ($override?->shift_end   ? substr($override->shift_end,   0, 5) : $dayShiftEnd);

                // Late / undertime — use modular helpers to handle overnight shifts correctly.
                // Skipped for flexi schedules (no fixed start/end expectations).
                $status = 'present';
                $lateMinutes = 0;
                if (!$isFlexi && $dayShiftStart && $clockInTime) {
                    $lateMinutes = $calcLate($clockInTime, $dayShiftStart, $dayShiftEnd ?? '17:00');
                    if ($lateMinutes > 0) $status = 'late';
                }

                // Undertime: clock-out time is before shift end
                $undertimeMinutes = 0;
                if (!$isFlexi && $dayShiftEnd && $clockOutTime) {
                    $undertimeMinutes = $calcUT($clockOutTime, $dayShiftStart ?? '08:00', $dayShiftEnd);
                }
            }

            // Over break — actual break/lunch vs configured allowances
            $overBreakMinutes = 0;
            if ($log && $breakConfig) {
                if ($breakConfig->break_allowed) {
                    $actualBreakMins = 0;
                    foreach ($log->breaks ?? [] as $break) {
                        if (! empty($break['start']) && ! empty($break['end'])) {
                            $actualBreakMins += (int) Carbon::parse($break['start'])->diffInMinutes(Carbon::parse($break['end']));
                        }
                    }
                    $overBreakMinutes += max(0, $actualBreakMins - $allowedBreakMins);
                }

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
                'late_minutes'         => $lateMinutes ?? 0,
                'undertime_minutes'    => $undertimeMinutes,
                'over_break_minutes'   => $overBreakMinutes,
                'correction'           => $correction,
                'overtime'             => $overtime,
                'removed_corrections'  => $removedCorr ?: null,
                'removed_overtime'     => $removedOt   ?: null,
                'leave'                => $leave,
                'holiday'              => $holiday ? [
                    'id'   => $holiday->id,
                    'name' => $holiday->name,
                    'type' => $holiday->type,
                ] : null,
                'shift_override'       => $override ? [
                    'shift_start'         => $override->shift_start ? substr($override->shift_start, 0, 5) : null,
                    'shift_end'           => $override->shift_end ? substr($override->shift_end,   0, 5) : null,
                    'promotes_to_workday' => $override->promotes_to_workday,
                    'demotes_to_restday'  => $override->demotes_to_restday,
                    'note'                => $override->note,
                ] : null,
                'effective_schedule_shift' => $dayShiftStart && $dayShiftEnd ? [
                    'shift_start' => substr($dayShiftStart, 0, 5),
                    'shift_end'   => substr($dayShiftEnd, 0, 5),
                ] : null,
                'training'             => $training ? [
                    'id'          => $training->id,
                    'hours'       => (float) $training->hours,
                    'description' => $training->description,
                ] : null,
            ];

            $cursor->addDay();
        }

        return AttendanceDayResource::collection(collect($days));
    }
}