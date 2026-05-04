<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceDayResource;
use App\Models\AttendanceCorrection;
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
        $target   = User::with('schedule')->findOrFail($targetId);

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

        $schedule   = $target->schedule;
        $workDays   = $schedule?->work_days ?? []; // ['monday', 'tuesday', ...]
        $shiftStart = $schedule?->shift_start;     // "08:00"
        $today      = now()->toDateString();

        $days = [];
        $cursor = $start->copy();

        while ($cursor <= $end) {
            $dateStr    = $cursor->toDateString();
            $dayName    = strtolower($cursor->englishDayOfWeek); // 'monday' etc.
            $isWorkDay  = in_array($dayName, $workDays);
            $isFuture   = $dateStr > $today;
            $log        = $logs[$dateStr] ?? null;
            $correction = $corrections["{$dateStr}_correction"] ?? null;
            $overtime   = $corrections["{$dateStr}_overtime"]   ?? null;

            if ($isFuture) {
                $status = 'upcoming';
            } elseif (! $isWorkDay) {
                $status = 'rest_day';
            } elseif (! $log || ! $log->clock_in) {
                $status = 'absent';
            } else {
                // Determine present vs late — 15-minute grace period
                $status = 'present';
                if ($shiftStart) {
                    $shiftCarbon   = Carbon::parse($dateStr . ' ' . $shiftStart);
                    $clockInCarbon = Carbon::parse($log->clock_in);
                    if ($clockInCarbon->gt($shiftCarbon->addMinutes(15))) {
                        $status = 'late';
                    }
                }
            }

            $days[] = [
                'date'                 => $dateStr,
                'day_of_week'          => $cursor->englishDayOfWeek,
                'status'               => $status,
                'clock_in'             => $log?->clock_in?->toISOString(),
                'clock_out'            => $log?->clock_out?->toISOString(),
                'total_worked_minutes' => $log?->total_worked_minutes,
                'correction'           => $correction,
                'overtime'             => $overtime,
            ];

            $cursor->addDay();
        }

        return AttendanceDayResource::collection(collect($days));
    }
}
