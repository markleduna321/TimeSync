<?php

namespace App\Services;

use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\ScheduleOverride;
use App\Models\TimeLog;
use App\Models\TrainingEntry;
use App\Models\UserAllowance;
use App\Models\UserDeduction;
use App\Models\UserGovernmentDeductionSetting;
use App\Models\UserPaySetting;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

/**
 * Philippine-government-compliant payslip computation service.
 *
 * References:
 * - SSS: Circular 2023-005 (contribution table)
 * - PhilHealth: PhilHealth Circular 2024-0005 (5% total; employee 2.5%)
 * - Pag-IBIG: RA 9679 + HDMF 2025 update (employee share capped 200/month; MFS cap ₱10,000 × 2%)
 * - Withholding Tax: TRAIN Law (RA 10963)
 * - 1st cutoff: semi-monthly BIR table (annual / 24)
 * - 2nd cutoff: cumulative monthly adjustment (Monthly table - 1st cutoff WHT)
 * - SSS WISP: mandatory provident fund for MSC > 20000 (100/month, split 50/cutoff)
 * - De minimis: BIR RR 11-2018 / RMC 50-2018
 * - 13th Month: PD 851; first 90000 non-taxable (TRAIN)
 * - Holiday pay: Labor Code Arts. 93-94
 */
class PayslipComputationService
{
    private const SSS_TABLE = [
        [1000,   1249.99,   45.00,   0],
        [1250,   2249.99,   90.00,   0],
        [2250,   3249.99,  135.00,   0],
        [3250,   4249.99,  180.00,   0],
        [4250,   5249.99,  225.00,   0],
        [5250,   6249.99,  270.00,   0],
        [6250,   7249.99,  315.00,   0],
        [7250,   8249.99,  360.00,   0],
        [8250,   9249.99,  405.00,   0],
        [9250,  10249.99,  450.00,   0],
       [10250,  11249.99,  495.00,   0],
       [11250,  12249.99,  540.00,   0],
       [12250,  13249.99,  585.00,   0],
       [13250,  14249.99,  630.00,   0],
       [14250,  15249.99,  675.00,   0],
       [15250,  16249.99,  720.00,   0],
       [16250,  17249.99,  765.00,   0],
       [17250,  18249.99,  810.00,   0],
       [18250,  19249.99,  855.00,   0],
       [19250,  20249.99,  900.00,   0],
       [20250,  21249.99,  945.00,   0],
       [21250,  22249.99,  990.00,   0],
       [22250,  23249.99, 1035.00,   0],
       [23250,  24249.99, 1080.00,   0],
       [24250,  25249.99, 1125.00,   0],
       [25250,  26249.99, 1170.00,   0],
       [26250,  27249.99, 1215.00,   0],
       [27250,  28249.99, 1260.00,   0],
       [28250,  29249.99, 1305.00,   0],
       [29250,  30000.00, 1350.00,   0],
    ];

    public function computeSSS(float $monthlySalary): array
    {
        $msc = min(30000.0, max(1000.0, $monthlySalary));
        foreach (self::SSS_TABLE as [$min, $max, $ss, $wisp]) {
            if ($msc >= $min && $msc <= $max) {
                return ['ss' => $ss, 'wisp' => $wisp, 'total' => $ss + $wisp];
            }
        }
        $last = end(self::SSS_TABLE);
        return ['ss' => $last[2], 'wisp' => $last[3], 'total' => $last[2] + $last[3]];
    }

    public function computePhilHealth(float $monthlySalary): float
    {
        $share = $monthlySalary * 0.025;
        return round(max(250.0, min(2500.0, $share)), 2);
    }

    public function computePagIbig(float $monthlySalary): float
    {
        $rate = $monthlySalary <= 1500.0 ? 0.01 : 0.02;
        return round(min(200.0, $monthlySalary * $rate), 2);
    }

    public function computeWithholdingTaxSemiMonthly(float $taxableIncome): float
    {
        if ($taxableIncome <= 10417.0)  return 0.0;
        if ($taxableIncome <= 16667.0)  return round(($taxableIncome - 10417.0) * 0.15, 2);
        if ($taxableIncome <= 33333.0)  return round(937.50 + ($taxableIncome - 16667.0) * 0.20, 2);
        if ($taxableIncome <= 83333.0)  return round(4270.83 + ($taxableIncome - 33333.0) * 0.25, 2);
        if ($taxableIncome <= 333333.0) return round(16770.83 + ($taxableIncome - 83333.0) * 0.30, 2);
        return round(91770.83 + ($taxableIncome - 333333.0) * 0.35, 2);
    }

    public function computeWithholdingTaxMonthly(float $taxableIncome): float
    {
        if ($taxableIncome <= 20833.0)   return 0.0;
        if ($taxableIncome <= 33333.0)   return round(($taxableIncome - 20833.0) * 0.15, 2);
        if ($taxableIncome <= 66667.0)   return round(1875.0 + ($taxableIncome - 33333.0) * 0.20, 2);
        if ($taxableIncome <= 166667.0)  return round(8541.80 + ($taxableIncome - 66667.0) * 0.25, 2);
        if ($taxableIncome <= 666667.0)  return round(33541.80 + ($taxableIncome - 166667.0) * 0.30, 2);
        return round(183541.80 + ($taxableIncome - 666667.0) * 0.35, 2);
    }

    public function computeDailyRate(float $monthlySalary, int $workDaysPerWeek): float
    {
        $divisor = $workDaysPerWeek >= 6 ? 26.0 : 22.0;
        return round($monthlySalary / $divisor, 4);
    }

    public function computeLateDeduction(float $dailyRate, int $lateMinutes): float
    {
        if ($lateMinutes <= 0) return 0.0;
        return round(($dailyRate / (8 * 60)) * $lateMinutes, 2);
    }

    public function computeUndertimeDeduction(float $dailyRate, int $undertimeMinutes): float
    {
        if ($undertimeMinutes <= 0) return 0.0;
        return round(($dailyRate / (8 * 60)) * $undertimeMinutes, 2);
    }

    public function computeOverBreakDeduction(float $dailyRate, int $overBreakMinutes): float
    {
        if ($overBreakMinutes <= 0) return 0.0;
        return round(($dailyRate / (8 * 60)) * $overBreakMinutes, 2);
    }

    public function computeOvertimePay(float $dailyRate, int $overtimeMinutes, bool $isHoliday = false): float
    {
        if ($overtimeMinutes <= 0) return 0.0;
        $multiplier = $isHoliday ? 1.30 * 1.25 : 1.25;
        return round(($dailyRate / 8.0) * $multiplier * ($overtimeMinutes / 60.0), 2);
    }

    /**
     * Rest day work — first 8 hours: +30% over regular hourly rate (DOLE Art. 93).
     */
    public function computeRestDayPay(float $dailyRate, int $minutes): float
    {
        if ($minutes <= 0) return 0.0;
        return round(($dailyRate / 8.0) * 1.30 * ($minutes / 60.0), 2);
    }

    /**
     * Rest Day Overtime (RDOT) — hours beyond 8 on a rest day: +30% over rest-day rate
     * = hourly rate × 1.30 × 1.30 = 1.69× (DOLE Art. 93; BIR TRAIN-compliant).
     */
    public function computeRestDayOtPay(float $dailyRate, int $minutes): float
    {
        if ($minutes <= 0) return 0.0;
        return round(($dailyRate / 8.0) * 1.69 * ($minutes / 60.0), 2);
    }

    /**
     * Night Shift Differential — DOLE Art. 86: +10% of the regular hourly rate
     * for each hour of work performed between 10:00 PM and 6:00 AM.
     *
     * BIR ruling: NSD premium is part of gross compensation and IS taxable.
     *
     * @param float  $dailyRate  Employee's daily rate
     * @param int    $ndMinutes  Minutes worked within the 22:00–06:00 window (excluding breaks/lunch)
     */
    public function computeNightDiffPay(float $dailyRate, int $ndMinutes): float
    {
        if ($ndMinutes <= 0) return 0.0;
        // Premium = 10% of the regular hourly rate per ND hour (taxable, per BIR)
        return round(($dailyRate / 8.0) * 0.10 * ($ndMinutes / 60.0), 2);
    }

    /**
     * Calculate the number of minutes a work span falls within the DOLE night
     * differential window (22:00–06:00). The window crosses midnight, so we check
     * the [date 22:00, date+1 06:00] interval for each calendar date spanned by
     * the clock-in/out pair. We start one day before clock-in to catch early-morning
     * clock-ins (e.g. 02:00) that belong to the previous evening's window.
     *
     * @param Carbon   $clockIn    Full datetime, any timezone
     * @param Carbon   $clockOut   Full datetime, any timezone
     * @param string   $localTz    Business timezone (e.g. 'Asia/Manila')
     * @param array    $exclusions Array of [Carbon $start, Carbon $end] pairs (lunch, breaks) to exclude
     */
    public function computeNightDiffMinutes(Carbon $clockIn, Carbon $clockOut, string $localTz, array $exclusions = []): int
    {
        if ($clockIn->gte($clockOut)) return 0;

        $in  = $clockIn->copy()->setTimezone($localTz);
        $out = $clockOut->copy()->setTimezone($localTz);

        $total   = 0;
        $cursor  = $in->copy()->startOfDay()->subDay();   // start 1 day before to catch early-morning windows
        $lastDay = $out->copy()->startOfDay();

        while ($cursor->lte($lastDay)) {
            $ndStart = $cursor->copy()->setTime(22, 0, 0);
            $ndEnd   = $cursor->copy()->addDay()->setTime(6, 0, 0);

            $overlapStart = max($in->timestamp,  $ndStart->timestamp);
            $overlapEnd   = min($out->timestamp, $ndEnd->timestamp);

            if ($overlapEnd > $overlapStart) {
                $total += (int) round(($overlapEnd - $overlapStart) / 60);
            }

            $cursor->addDay();
        }

        // Subtract any lunch/break time that fell within the ND window
        foreach ($exclusions as [$exStart, $exEnd]) {
            if (!$exStart || !$exEnd) continue;
            $total -= $this->computeNightDiffMinutes($exStart, $exEnd, $localTz); // no exclusions = no recursion
        }

        return max(0, $total);
    }

    // ─── Overtime-aware late/undertime helpers ────────────────────────────────
    // Simple HH:MM → minutes-since-midnight conversion.
    private function toMins(string $hhmm): int
    {
        $parts = explode(':', $hhmm);
        if (count($parts) < 2 || ! is_numeric($parts[0]) || ! is_numeric($parts[1])) {
            \Log::warning("PayslipComputation: bad time value '{$hhmm}' in toMins(); defaulting to 0.");
            return 0;
        }
        return (int)$parts[0] * 60 + (int)$parts[1];
    }

    /**
     * Minutes late for a given clock-in time against a shift start/end.
     * Handles both regular (08:00–17:00) and overnight (22:00–06:00) shifts
     * by using modular 1440-minute arithmetic instead of HH:MM string comparison.
     */
    private function calcLateMinutes(string $ciTime, string $shiftStart, string $shiftEnd): int
    {
        $ci = $this->toMins($ciTime);
        $ss = $this->toMins($shiftStart);
        $se = $this->toMins($shiftEnd);

        if ($se >= $ss) {
            // Day shift — straight comparison
            return max(0, $ci - $ss);
        }

        // Overnight shift (se < ss): shift crosses midnight
        if ($ci >= $ss) {
            // Clock-in in evening sector (≥ shiftStart) — normal late
            return max(0, $ci - $ss);
        }
        if ($ci < $se) {
            // Clock-in in early-morning sector (< shiftEnd) — late by wrap-around distance
            return (1440 - $ss) + $ci;
        }
        // Dead zone: shiftEnd ≤ ci < shiftStart — employee arrived early before their night shift
        return 0;
    }

    /**
     * Minutes undertime for a given clock-out time against a shift start/end.
     * Handles both regular and overnight shifts.
     */
    private function calcUndertimeMinutes(string $coTime, string $shiftStart, string $shiftEnd): int
    {
        $co = $this->toMins($coTime);
        $ss = $this->toMins($shiftStart);
        $se = $this->toMins($shiftEnd);

        if ($se >= $ss) {
            // Day shift — straight comparison
            return max(0, $se - $co);
        }

        // Overnight shift (se < ss)
        if ($co < $se) {
            // Clock-out in early-morning sector (< shiftEnd) — normal undertime
            return $se - $co;
        }
        if ($co >= $ss) {
            // Clock-out still in evening sector (≥ shiftStart) — left before midnight
            return (1440 + $se) - $co;
        }
        // Clock-out between shiftEnd and shiftStart (after end of shift) — no undertime
        return 0;
    }

    /**
     * Returns only the PREMIUM portion of holiday pay (not the base daily wage).
     * The caller is responsible for the base daily rate already included via daysWorked.
     * Regular holiday not worked  → +1× daily rate (Art. 94: paid even if absent)
     * Regular holiday worked      → +1× daily rate (total = 200%, base already counted)
     * Special non-working worked  → +30% of daily rate
     */
    public function computeHolidayExtra(float $dailyRate, string $holidayType, bool $worked): float
    {
        if ($holidayType === 'regular' && !$worked) return round($dailyRate, 2);
        if ($holidayType === 'regular' && $worked)  return round($dailyRate, 2);
        if ($holidayType === 'special' && $worked)  return round($dailyRate * 0.30, 2);
        return 0.0;
    }

    /**
     * Holiday pay premium prorated to actual minutes worked on the holiday date.
     * Use this instead of computeHolidayExtra() for cross-midnight (partial-day) scenarios.
     *
     * Regular holiday worked  → +100% of hourly rate × minutes
     * Special holiday worked  → +30%  of hourly rate × minutes
     * Not worked              → 0.0  (the daily guarantee is handled at the day level)
     *
     * @param float  $dailyRate   Employee's daily rate
     * @param string $holidayType 'regular' or 'special'
     * @param bool   $worked      Whether the employee was present during these minutes
     * @param int    $minutes     Minutes physically worked on the holiday date
     */
    public function computeHolidayExtraMinutes(float $dailyRate, string $holidayType, bool $worked, int $minutes): float
    {
        if ($minutes <= 0 || !$worked) return 0.0;
        $multiplier = match ($holidayType) {
            'regular' => 1.0,
            'special' => 0.30,
            default   => 0.0,
        };
        return round(($dailyRate / 8.0) * $multiplier * ($minutes / 60.0), 2);
    }

    public function computeThirteenthMonth(float $sumOfBasicPays): float
    {
        return round($sumOfBasicPays / 12.0, 2);
    }

    public function compute(
        \App\Models\User $employee,
        Carbon $periodStart,
        Carbon $periodEnd,
        float  $incentiveAmount = 0.0,
        string $incentiveDescription = 'Incentive / Bonus',
        string $method = 'days_worked'
    ): array {
        $monthlySalary = (float)($employee->monthly_salary ?? 0);
        if ($monthlySalary <= 0) {
            throw new \RuntimeException("Employee [{$employee->name}] has no monthly salary set.");
        }

        $cutoffType  = $periodEnd->day <= 15 ? 'first' : 'second';
        $warnings    = [];
        $schedule    = $employee->schedule;
        $isFlexi     = $schedule?->schedule_type === 'flexi';
        $workDays    = $schedule?->work_days ?? [];
        // Normalize keys to 3-letter title-case so 'monday', 'MON', and 'Mon' all resolve correctly
        $timeByDay   = collect($schedule?->time_by_day ?? [])
            ->mapWithKeys(fn ($v, $k) => [ucfirst(substr(strtolower($k), 0, 3)) => $v])
            ->all();
        // Normalize to HH:MM — DB may store as "13:00:00" (with seconds)
        $shiftStart  = substr($schedule?->shift_start ?? '08:00', 0, 5);
        $shiftEnd    = substr($schedule?->shift_end   ?? '17:00', 0, 5);
        $localTz     = env('APP_LOCAL_TIMEZONE', 'Asia/Manila');
        $daysPerWeek = count($workDays);
        if ($daysPerWeek === 0) {
            \Log::warning("PayslipComputation: Employee [{$employee->name}] has no work_days configured; defaulting to 5 days/week.");
            $warnings[] = "No work schedule configured for {$employee->name}; daily rate defaulted to a 5-day week. Assign a schedule before releasing this payslip.";
            $daysPerWeek = 5;
        }
        $dailyRate   = $this->computeDailyRate($monthlySalary, $daysPerWeek);

        // Break config for over-break deduction
        $employee->loadMissing('breakConfig');
        $breakConfig      = $employee->breakConfig;
        $allowedBreakMins = $breakConfig
            ? ($breakConfig->break_count * $breakConfig->break_duration_minutes)
            : 0;
        $allowedLunchMins = $breakConfig ? $breakConfig->lunch_duration_minutes : 60;

        $toDateStr = fn ($val) => $val instanceof \Carbon\Carbon
            ? $val->format('Y-m-d')
            : substr((string) $val, 0, 10);

        // Group logs by date. In the rare case of multiple logs for the same date
        // (split shifts), take the earliest clock-in as the primary log for time-based
        // calculations and aggregate overtime_minutes across all sessions so none are
        // silently discarded as keyBy() would do.
        $logsGrouped = TimeLog::where('user_id', $employee->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->groupBy(fn ($l) => $toDateStr($l->date));

        $logs = $logsGrouped->map(function ($group) {
            $primary = $group->sortBy(fn ($l) => $l->getRawOriginal('clock_in') ?? '')->first();
            $primary->overtime_minutes = $group->sum('overtime_minutes');
            // For split shifts: use the latest clock_out across all sessions so undertime is not overcounted
            $latestOut = $group->filter(fn ($l) => $l->getRawOriginal('clock_out'))
                ->sortByDesc(fn ($l) => $l->getRawOriginal('clock_out'))
                ->first();
            if ($latestOut && $latestOut->id !== $primary->id) {
                $primary->clock_out = $latestOut->clock_out;
            }
            return $primary;
        });

        $holidays = Holiday::whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()->keyBy(fn($h) => $toDateStr($h->date));

        // Build a map of date => days_value for approved paid-leave days in this period.
        // A full-day leave counts as 1.0; a half-day leave counts as 0.5.
        $paidLeaveDates = [];
        $approvedPaidLeaves = LeaveApplication::where('user_id', $employee->id)
            ->where('status', 'approved')
            ->whereHas('leaveType', fn ($q) => $q->where('is_paid', true))
            ->where('start_date', '<=', $periodEnd->toDateString())
            ->where('end_date',   '>=', $periodStart->toDateString())
            ->get();
        foreach ($approvedPaidLeaves as $leave) {
            $leaveStart = max($leave->start_date->toDateString(), $periodStart->toDateString());
            $leaveEnd   = min($leave->end_date->toDateString(),   $periodEnd->toDateString());
            foreach (CarbonPeriod::create($leaveStart, $leaveEnd) as $day) {
                $ds = $day->toDateString();
                // Half-day only applies when the application covers exactly one day
                $value = ($leave->half_day && $leave->start_date->eq($leave->end_date)) ? 0.5 : 1.0;
                $paidLeaveDates[$ds] = ($paidLeaveDates[$ds] ?? 0.0) + $value;
            }
        }

        // Build a map of date => days_value for approved *unpaid* leave days in this period.
        $unpaidLeaveDates = [];
        $approvedUnpaidLeaves = LeaveApplication::where('user_id', $employee->id)
            ->where('status', 'approved')
            ->whereHas('leaveType', fn ($q) => $q->where('is_paid', false))
            ->where('start_date', '<=', $periodEnd->toDateString())
            ->where('end_date',   '>=', $periodStart->toDateString())
            ->get();
        foreach ($approvedUnpaidLeaves as $leave) {
            $leaveStart = max($leave->start_date->toDateString(), $periodStart->toDateString());
            $leaveEnd   = min($leave->end_date->toDateString(),   $periodEnd->toDateString());
            foreach (CarbonPeriod::create($leaveStart, $leaveEnd) as $day) {
                $ds = $day->toDateString();
                $value = ($leave->half_day && $leave->start_date->eq($leave->end_date)) ? 0.5 : 1.0;
                $unpaidLeaveDates[$ds] = ($unpaidLeaveDates[$ds] ?? 0.0) + $value;
            }
        }

        // Schedule overrides — admin-set prospective shift overrides for specific dates.
        $overrideMap = ScheduleOverride::where('user_id', $employee->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->keyBy(fn ($o) => $toDateStr($o->date));

        // Training entries for this period — compensated at hourly rate (daily_rate / 8).
        // Build a per-day map for the carve-out logic in the day loop, and sum total hours
        // for the TRAINING_PAY earnings line.
        $trainingCollection = TrainingEntry::where('user_id', $employee->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get();
        $trainingMap        = $trainingCollection->keyBy(fn ($t) => $toDateStr($t->date));
        $totalTrainingHours = (float) $trainingCollection->sum('hours');

        $daysScheduled = 0;
        $daysWorked    = 0.0;
        $daysAbsent    = 0.0;
        $paidLeaveDays   = 0.0; // approved paid-leave days consumed this period
        $unpaidLeaveDays = 0.0; // approved unpaid-leave days consumed this period
        $holidayDays        = 0; // scheduled holiday days where employee did not work
        $holidayDaysWorked  = 0; // scheduled holiday days where employee clocked in
        $lateMinutes = $undertimeMins = $overBreakMins = 0;
        $holidayPayExtra = $overtimePay = 0.0;
        $otMinutes = $restDayMinutes = $restDayOtMinutes = 0;
        $restDayPay = $restDayOtPay = 0.0;
        $ndMinutes = 0;
        $trainingDays = 0; // scheduled work days with a training entry (paid hourly, not as full day)

        foreach (CarbonPeriod::create($periodStart, $periodEnd) as $cursor) {
            $dateStr   = $cursor->toDateString();
            $isWorkDay = in_array($cursor->format('D'), $workDays)
                      || in_array(strtolower($cursor->englishDayOfWeek), $workDays);
            $dayKey = $cursor->format('D');
            $dayTimeOverride = $timeByDay[$dayKey] ?? null;
            $dayShiftStart = $dayTimeOverride['shift_start'] ?? $shiftStart;
            $dayShiftEnd = $dayTimeOverride['shift_end'] ?? $shiftEnd;
            $holiday = $holidays[$dateStr] ?? null;
            $log     = $logs[$dateStr] ?? null;
            $worked  = $log && $log->clock_in;

            // Apply schedule override for this date.
            $override = $overrideMap[$dateStr] ?? null;
            $training = $trainingMap[$dateStr] ?? null;
            if ($override?->demotes_to_restday) {
                $isWorkDay = false;
            } elseif ($override?->promotes_to_workday) {
                $isWorkDay = true;
            }

            // Training day on a scheduled work day: compensated at hourly rate via TRAINING_PAY.
            // Not counted as daysWorked (days_worked method) and deducted as absent equivalent
            // under flat_rate so the employee receives only the trained hours' worth of pay.
            if ($training && $isWorkDay) {
                $daysScheduled++;
                $trainingDays++;
                continue;
            }

            if (!$isWorkDay && !$holiday) {
                // Pure rest day — pay is ONLY triggered by an approved OT correction
                // (overtime_minutes > 0 on the time_log). Clocking in alone does NOT
                // generate rest-day pay; the employee must file and receive approval first.
                $otMins = (int)($log?->overtime_minutes ?? 0);
                if ($otMins > 0) {
                    $restDayOtMinutes += $otMins;
                    $restDayOtPay     += $this->computeRestDayOtPay($dailyRate, $otMins);
                }
                continue;
            }

            if (!$isWorkDay && $holiday) {
                // Holiday that falls on the employee's rest day.
                //
                // Regular holiday guarantee (Art. 94): employee receives their daily
                // rate regardless of whether they worked — this is unconditional.
                // Under flat-rate, the half-month rate already covers this, so we
                // only add the extra under days-worked.
                if ($holiday->type === 'regular' && $method === 'days_worked') {
                    $holidayPayExtra += $this->computeHolidayExtra($dailyRate, 'regular', false);
                }

                // Additional compensation requires an approved OT correction
                // (overtime_minutes set on the time_log). Clocking in alone is NOT
                // sufficient — the employee must file an overtime request.
                $otMins = (int)($log?->overtime_minutes ?? 0);
                if ($otMins > 0) {
                    // Special holiday: add the +30% premium for working (regular holiday
                    // premium is already covered by the guarantee above).
                    if ($holiday->type === 'special' && $method === 'days_worked') {
                        $holidayPayExtra += $this->computeHolidayExtra($dailyRate, 'special', true);
                    }
                    // All approved OT on a rest-day holiday is compensated at RDOT rate.
                    $restDayOtMinutes += $otMins;
                    $restDayOtPay     += $this->computeRestDayOtPay($dailyRate, $otMins);
                }
                continue;
            }

            $daysScheduled++;
            if (!$worked) {
                if (isset($paidLeaveDates[$dateStr])) {
                    // Approved paid leave — treat as worked, no wage deduction
                    $daysWorked    += $paidLeaveDates[$dateStr];
                    $paidLeaveDays += $paidLeaveDates[$dateStr];
                } elseif ($holiday) {
                    // Any declared holiday where the employee did not work:
                    //   Regular  → full daily rate paid (Labor Code Art. 94)
                    //   Special  → no work, no pay — but NOT an absence penalty
                    // Either way: remove from scheduled count (it is a holiday, not a work day)
                    $daysScheduled--;
                    $holidayDays++;
                    // Under Flat Rate, basic_pay is already the full half-month
                    // regardless of days worked, so we must NOT add an extra
                    // holiday pay on top — the flat rate already covers it.
                    // Under Days-Worked, basic_pay only counts actual days worked,
                    // so we need to add the holiday's daily rate here.
                    if ($holiday->type === 'regular' && $method === 'days_worked') {
                        $holidayPayExtra += $this->computeHolidayExtra($dailyRate, 'regular', false);
                    }
                    // Special non-working holiday: no pay, no absent — nothing more to do
                } elseif (isset($unpaidLeaveDates[$dateStr])) {
                    // Approved unpaid leave — no pay, but not an unauthorized absence
                    $unpaidLeaveDays += $unpaidLeaveDates[$dateStr];
                } else {
                    $daysAbsent += 1.0;
                }
                continue;
            }

            $daysWorked += 1.0;

            // Parse raw UTC values and convert to local timezone for HH:MM comparison.
            $clockInRaw   = $log->getRawOriginal('clock_in');
            $clockOutRaw  = $log->getRawOriginal('clock_out');
            $clockInTime  = $clockInRaw  ? Carbon::parse($clockInRaw,  'UTC')->setTimezone($localTz)->format('H:i') : null;
            $clockOutTime = $clockOutRaw ? Carbon::parse($clockOutRaw, 'UTC')->setTimezone($localTz)->format('H:i') : null;

            // ── Cross-midnight holiday split ─────────────────────────────────────────
            // Overnight shifts cross a calendar date boundary. If the start date and end
            // date have different holiday statuses, each portion must be compensated at
            // its own day's applicable rate:
            //   pre-midnight  → today's holiday status  ($dateStr)
            //   post-midnight → next calendar day's status ($dateStr + 1 day)
            //
            // Rest-day premium is intentionally NOT applied to the post-midnight portion.
            // The employee is completing their scheduled shift — they were not called in
            // on a separate rest-day engagement. (Rest-day + holiday premium only fires
            // when time_log.date itself is the rest day, handled in the !$isWorkDay branch.)
            $clockInLocal  = $clockInRaw  ? Carbon::parse($clockInRaw,  'UTC')->setTimezone($localTz) : null;
            $clockOutLocal = $clockOutRaw ? Carbon::parse($clockOutRaw, 'UTC')->setTimezone($localTz) : null;
            $crossesMidnight = $clockInLocal && $clockOutLocal
                && !$clockInLocal->isSameDay($clockOutLocal);

            if ($crossesMidnight) {
                // Split point: 00:00:00 of the next calendar day (local time)
                $midnightLocal    = $clockInLocal->copy()->startOfDay()->addDay();
                $preMidnightMins  = (int) round($clockInLocal->diffInMinutes($midnightLocal));
                $postMidnightMins = (int) round($midnightLocal->diffInMinutes($clockOutLocal));
                $postMidnightDate = $clockOutLocal->toDateString();
                $nextDayHoliday   = $holidays[$postMidnightDate] ?? null;

                if ($holiday || $nextDayHoliday) {
                    $holidayDaysWorked++;
                }
                if ($holiday) {
                    // Prorate today's holiday premium to pre-midnight hours only.
                    $holidayPayExtra += $this->computeHolidayExtraMinutes($dailyRate, $holiday->type, true, $preMidnightMins);
                }
                if ($nextDayHoliday) {
                    // Post-midnight hours fall on a holiday — no rest-day multiplier.
                    $holidayPayExtra += $this->computeHolidayExtraMinutes($dailyRate, $nextDayHoliday->type, true, $postMidnightMins);
                }
            } else {
                // Non-cross-midnight shift: standard full-day holiday premium.
                if ($holiday) {
                    $holidayDaysWorked++;
                    $holidayPayExtra += $this->computeHolidayExtra($dailyRate, $holiday->type, true);
                }
            }

            // Per-day effective shift overrides (set by admin when approving a correction).
            // These take precedence over the employee's permanent schedule.
            // Note: day-status overrides (promotes_to_workday / demotes_to_restday) do NOT
            // carry shift times — guard against null so the base schedule is preserved.
            $dayShiftStart = $log->effective_shift_start
                ? substr($log->effective_shift_start, 0, 5)
                : ($override?->shift_start ? substr($override->shift_start, 0, 5) : $dayShiftStart);
            $dayShiftEnd   = $log->effective_shift_end
                ? substr($log->effective_shift_end,   0, 5)
                : ($override?->shift_end   ? substr($override->shift_end,   0, 5) : $dayShiftEnd);

            // Late / undertime — use modular helpers to handle overnight shifts correctly.
            // Skipped for flexi schedules (no fixed start/end expectations).
            if (!$isFlexi) {
                if ($clockInTime) {
                    $late = $this->calcLateMinutes($clockInTime, $dayShiftStart, $dayShiftEnd);
                    $lateMinutes += $late;
                }
                if ($clockOutTime) {
                    $ut = $this->calcUndertimeMinutes($clockOutTime, $dayShiftStart, $dayShiftEnd);
                    $undertimeMins += $ut;
                }
            }

            if ($log->overtime_minutes ?? 0) {
                $otMins = (int)$log->overtime_minutes;
                $otMinutes += $otMins;
                $overtimePay += $this->computeOvertimePay($dailyRate, $otMins, (bool)$holiday);
            }

            // Night Shift Differential (DOLE Art. 86) — 10% premium for 22:00–06:00 work.
            // Lunch and break time within the ND window are excluded (not compensable ND).
            if ($clockInRaw && $clockOutRaw) {
                $ndExclusions = [];
                if ($log->lunch_start && $log->lunch_end) {
                    $ndExclusions[] = [
                        Carbon::parse($log->getRawOriginal('lunch_start'), 'UTC'),
                        Carbon::parse($log->getRawOriginal('lunch_end'),   'UTC'),
                    ];
                }
                foreach ($log->breaks ?? [] as $b) {
                    if (!empty($b['start']) && !empty($b['end'])) {
                        $ndExclusions[] = [Carbon::parse($b['start']), Carbon::parse($b['end'])];
                    }
                }
                $ndMins = $this->computeNightDiffMinutes(
                    Carbon::parse($clockInRaw,  'UTC'),
                    Carbon::parse($clockOutRaw, 'UTC'),
                    $localTz,
                    $ndExclusions
                );
                $ndMinutes += $ndMins;
            }

            // Over break — regular breaks (if enabled) + lunch overrun
            if ($breakConfig) {
                if ($breakConfig->break_allowed) {
                    $actualBreakMins = 0;
                    foreach ($log->breaks ?? [] as $break) {
                        if (! empty($break['start']) && ! empty($break['end'])) {
                            $actualBreakMins += (int) Carbon::parse($break['start'])->diffInMinutes(Carbon::parse($break['end']));
                        }
                    }
                    $overBreakMins += max(0, $actualBreakMins - $allowedBreakMins);
                }
                if ($log->lunch_start && $log->lunch_end) {
                    $actualLunchMins = (int) Carbon::parse($log->lunch_start)->diffInMinutes(Carbon::parse($log->lunch_end));
                    $overBreakMins  += max(0, $actualLunchMins - $allowedLunchMins);
                }
            }
        } // end foreach CarbonPeriod

        // Basic pay depends on the chosen method:
        //   days_worked (default, DOLE Days-Worked Method) — basic = days_worked × daily_rate
        //   flat_rate                                  — basic = (monthly_salary / 2) − (days_absent × daily_rate)
        //   Late / undertime / over-break deductions, OT, allowances, holiday pay,
        //   rest-day pay, and government contributions all apply in BOTH methods.
        if ($method === 'flat_rate') {
            $baseHalf        = round($monthlySalary / 2, 2);
            // Training days are excluded from daysWorked but deducted like absences so
            // the flat-rate base only covers the trained hours (topped up by TRAINING_PAY).
            $absentDeduction = round(($daysAbsent + $trainingDays) * $dailyRate, 2);
            $basicPay        = round($baseHalf - $absentDeduction, 2);
        } else {
            $basicPay = round($daysWorked * $dailyRate, 2);
        }
        $lateDeduction = $this->computeLateDeduction($dailyRate, $lateMinutes);
        $utDeduction   = $this->computeUndertimeDeduction($dailyRate, $undertimeMins);
        $obDeduction   = $this->computeOverBreakDeduction($dailyRate, $overBreakMins);

        $allowances = UserAllowance::with('allowanceType')
            ->where('user_id', $employee->id)
            ->where('is_active', true)
            ->where('effective_from', '<=', $periodEnd->toDateString())
            ->where(function ($q) use ($periodStart) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $periodStart->toDateString());
            })->get();

        $customDeductions = UserDeduction::with('deductionType')
            ->where('user_id', $employee->id)
            ->where('is_active', true)
            ->where('effective_from', '<=', $periodEnd->toDateString())
            ->where(function ($q) use ($periodStart) {
                $q->whereNull('effective_until')->orWhere('effective_until', '>=', $periodStart->toDateString());
            })->get();

        $sss        = $this->computeSSS($monthlySalary);
        $philhealth = $this->computePhilHealth($monthlySalary);
        $pagibig    = $this->computePagIbig($monthlySalary);

        // --- Government contribution toggles (per-user override) ---
        $govEnabled = UserGovernmentDeductionSetting::where('user_id', $employee->id)
            ->pluck('is_enabled', 'code');
        $sssEnabled = (bool)($govEnabled['SSS']             ?? true);
        $phEnabled  = (bool)($govEnabled['PHILHEALTH']       ?? true);
        $piEnabled  = (bool)($govEnabled['PAGIBIG']          ?? true);
        $whtEnabled = (bool)($govEnabled['WITHHOLDING_TAX']  ?? true);

        // --- Pay setting toggles (per-user override) ---
        $payEnabled      = UserPaySetting::where('user_id', $employee->id)->pluck('is_enabled', 'code');
        $nightDiffEnabled = (bool)($payEnabled['NIGHT_DIFF']  ?? true);
        $holidayPayEnabled = (bool)($payEnabled['HOLIDAY_PAY'] ?? true);

        if (!$sssEnabled) { $sss = ['ss' => 0.0, 'wisp' => 0.0]; }
        if (!$phEnabled)  { $philhealth = 0.0; }
        if (!$piEnabled)  { $pagibig    = 0.0; }
        // $whtEnabled applied below when building $wht

        $sssHalf        = round($sss['ss']   / 2, 2);
        $wispHalf       = round($sss['wisp'] / 2, 2);
        $philhealthHalf = round($philhealth   / 2, 2);
        $pagibigHalf    = round($pagibig      / 2, 2);
        $govtHalf       = $sssHalf + $wispHalf + $philhealthHalf + $pagibigHalf;

        $earnings = [];
        $sort = 0;

        $earnings[] = ['code' => 'BASIC',       'description' => 'Basic Pay',    'sort_order' => $sort++, 'amount' => $basicPay,      'is_taxable' => true];
        if ($holidayPayExtra > 0 && $holidayPayEnabled) {
            $earnings[] = ['code' => 'HOLIDAY_PAY', 'description' => 'Holiday Pay', 'sort_order' => $sort++, 'amount' => $holidayPayExtra, 'is_taxable' => true];
        }
        if ($overtimePay > 0) {
            $earnings[] = ['code' => 'OVERTIME',    'description' => 'Overtime Pay (OT)', 'sort_order' => $sort++, 'amount' => $overtimePay, 'is_taxable' => true];
        }
        if ($restDayPay > 0) {
            $earnings[] = ['code' => 'RESTDAY_PAY', 'description' => 'Rest Day Pay (+30%)', 'sort_order' => $sort++, 'amount' => $restDayPay, 'is_taxable' => true];
        }
        if ($restDayOtPay > 0) {
            $earnings[] = ['code' => 'RDOT',        'description' => 'Rest Day OT Pay (RDOT +69%)', 'sort_order' => $sort++, 'amount' => $restDayOtPay, 'is_taxable' => true];
        }
        $nightDiffPay = $this->computeNightDiffPay($dailyRate, $ndMinutes);
        if ($nightDiffPay > 0 && $nightDiffEnabled) {
            $earnings[] = ['code' => 'NIGHT_DIFF', 'description' => 'Night Shift Differential (10%)', 'sort_order' => $sort++, 'amount' => $nightDiffPay, 'is_taxable' => true];
        }

        if ($totalTrainingHours > 0) {
            $trainingPay = round(($dailyRate / 8.0) * $totalTrainingHours, 2);
            $earnings[] = ['code' => 'TRAINING_PAY', 'description' => 'Training Pay', 'sort_order' => $sort++, 'amount' => $trainingPay, 'is_taxable' => true];
        }

        foreach ($allowances as $ua) {
            $earnings[] = [
                'code'        => $ua->allowanceType->code,
                'description' => $ua->description ?? $ua->allowanceType->name,
                'sort_order'  => $sort++,
                'amount'      => round((float)$ua->amount / 2, 2),
                'is_taxable'  => $ua->allowanceType->is_taxable,
            ];
        }

        if ($incentiveAmount > 0.0) {
            $earnings[] = ['code' => 'INCENTIVE', 'description' => $incentiveDescription ?: 'Incentive / Bonus', 'sort_order' => $sort++, 'amount' => round($incentiveAmount, 2), 'is_taxable' => true];
        }

        $grossTaxableEarnings = collect($earnings)->where('is_taxable', true)->sum('amount');
        $grossTaxable         = max(0.0, $grossTaxableEarnings - $lateDeduction - $utDeduction - $obDeduction);
        $grossPay             = collect($earnings)->sum('amount');
        $semiMonthlyTaxable   = max(0.0, $grossTaxable - $govtHalf);

        // --- 13th Month taxable excess (TRAIN Law) ---
        // If this is a December 2nd-cutoff payslip, add the taxable 13th month
        // excess (amount above ₱90,000) to the monthly taxable base so the
        // cumulative WHT computation catches it in this cutoff's adjustment.
        $thirteenthTaxable    = 0.0;
        $thirteenthIncluded   = false;
        if ($cutoffType === 'second' && $periodEnd->month === 12) {
            $thirteenthPayslip = Payslip::where('user_id', $employee->id)
                ->where('cutoff_type', '13th_month')
                ->where('status', 'released')
                ->whereYear('period_start', $periodEnd->year)
                ->first();
            $thirteenthTaxable  = (float)($thirteenthPayslip?->taxable_income ?? 0.0);
            $thirteenthIncluded = $thirteenthTaxable > 0.0;
        }

        if ($cutoffType === 'first') {
            $wht = $this->computeWithholdingTaxSemiMonthly($semiMonthlyTaxable);
        } else {
            $firstPayslip = Payslip::where('user_id', $employee->id)
                ->where('cutoff_type', 'first')
                ->whereYear('period_end', $periodEnd->year)
                ->whereMonth('period_end', $periodEnd->month)
                ->latest('period_end')->first();

            if ($firstPayslip) {
                // First cutoff exists, safely do the cumulative adjustment
                $firstTaxable = (float)($firstPayslip->taxable_income ?? 0.0);
                $firstWht     = (float)(PayslipLine::where('payslip_id', $firstPayslip->id)->where('code', 'WITHHOLDING_TAX')->value('amount') ?? 0.0);

                // Include 13th month taxable excess in December cumulative base
                $monthlyTaxable  = $firstTaxable + $semiMonthlyTaxable + $thirteenthTaxable;
                $totalMonthlyWht = $this->computeWithholdingTaxMonthly($monthlyTaxable);
                $wht             = max(0.0, round($totalMonthlyWht - $firstWht, 2));
            } else {
                // FIX: No 1st cutoff exists. Fall back to the semi-monthly table.
                $wht = $this->computeWithholdingTaxSemiMonthly($semiMonthlyTaxable);
            }
        }

        if (!$whtEnabled) { $wht = 0.0; }

        $deductions = [];
        $dsort = 0;

        if ($sssEnabled) {
            $deductions[] = ['code' => 'SSS', 'description' => 'SSS Contribution', 'sort_order' => $dsort++, 'amount' => $sssHalf, 'is_taxable' => false];
            
            // WISP disabled per client request
            // if ($wispHalf > 0) {
            //     $deductions[] = ['code' => 'SSS_WISP', 'description' => 'SSS WISP (Provident)', 'sort_order' => $dsort++, 'amount' => $wispHalf, 'is_taxable' => false];
            // }
        }
        if ($phEnabled) {
            $deductions[] = ['code' => 'PHILHEALTH', 'description' => 'PhilHealth Contribution', 'sort_order' => $dsort++, 'amount' => $philhealthHalf, 'is_taxable' => false];
        }
        if ($piEnabled) {
            $deductions[] = ['code' => 'PAGIBIG', 'description' => 'Pag-IBIG Contribution', 'sort_order' => $dsort++, 'amount' => $pagibigHalf, 'is_taxable' => false];
        }
        if ($whtEnabled) {
            $whtDesc = match(true) {
                $cutoffType === 'first'    => 'Withholding Tax — Semi-Monthly (TRAIN)',
                $thirteenthIncluded        => 'Withholding Tax — Dec Cumulative + 13th Month Excess (TRAIN)',
                default                    => 'Withholding Tax — Cumulative Adjustment (TRAIN)',
            };
            $deductions[] = [
                'code'        => 'WITHHOLDING_TAX',
                'description' => $whtDesc,
                'sort_order'  => $dsort++,
                'amount'      => $wht,
                'is_taxable'  => false,
            ];
        }

        if ($lateDeduction > 0) {
            $deductions[] = ['code' => 'LATE',       'description' => 'Late Deduction',       'sort_order' => $dsort++, 'amount' => $lateDeduction, 'is_taxable' => false];
        }
        if ($utDeduction > 0) {
            $deductions[] = ['code' => 'UNDERTIME',  'description' => 'Undertime Deduction',  'sort_order' => $dsort++, 'amount' => $utDeduction,   'is_taxable' => false];
        }
        if ($obDeduction > 0) {
            $deductions[] = ['code' => 'OVER_BREAK', 'description' => 'Over Break Deduction', 'sort_order' => $dsort++, 'amount' => $obDeduction,   'is_taxable' => false];
        }

        foreach ($customDeductions as $ud) {
            $deductions[] = [
                'code'        => $ud->deductionType->code,
                'description' => $ud->description ?? $ud->deductionType->name,
                'sort_order'  => $dsort++,
                'amount'      => (float)$ud->amount,
                'is_taxable'  => false,
            ];
        }

        $totalDeductions = round(collect($deductions)->sum('amount'), 2);
        // $totalDeductions already includes the late / undertime / over-break lines.
        // Subtracting them separately here caused double-deduction — fixed.
        $netPay          = round($grossPay - $totalDeductions, 2);

        return [
            'earnings'   => $earnings,
            'deductions' => $deductions,
            'warnings'   => $warnings,
            'summary'    => [
                'cutoff_type'       => $cutoffType,
                'method'            => $method,
                'taxable_income'    => round($semiMonthlyTaxable, 2),
                'monthly_salary'    => $monthlySalary,
                'daily_rate'        => $dailyRate,
                'basic_pay'         => $basicPay,
                'gross_pay'         => round($grossPay, 2),
                'total_deductions'  => $totalDeductions,
                'net_pay'           => $netPay,
                'days_scheduled'      => $daysScheduled,
                'days_worked'         => $daysWorked,
                'days_absent'         => $daysAbsent,
                'training_days'        => $trainingDays,
                'paid_leave_days'      => $paidLeaveDays,
                'unpaid_leave_days'   => $unpaidLeaveDays,
                'holiday_days'        => $holidayDays,
                'holiday_days_worked' => $holidayDaysWorked,
                'late_minutes'        => $lateMinutes,
                'undertime_minutes'   => $undertimeMins,
                'over_break_minutes'  => $overBreakMins,
                'ot_minutes'          => $otMinutes,
                'rest_day_minutes'    => $restDayMinutes,
                'rest_day_ot_minutes' => $restDayOtMinutes,
                'nd_minutes'          => $nightDiffEnabled ? $ndMinutes : 0,
            ],
        ];
    }

    public function computeAnnual13thMonth(\App\Models\User $employee, int $year): array
    {
        $payslips   = Payslip::where('user_id', $employee->id)->where('status', 'released')->whereYear('period_start', $year)->get();
        $sumBasic   = $payslips->sum('basic_pay');
        $amount     = $this->computeThirteenthMonth((float)$sumBasic);
        $nonTaxable = min(90000.0, $amount);
        $taxable    = max(0.0, $amount - $nonTaxable);
        return [
            'year'           => $year,
            'sum_basic_pay'  => round((float)$sumBasic, 2),
            'amount'         => $amount,
            'non_taxable'    => round($nonTaxable, 2),
            'taxable_amount' => round($taxable, 2),
        ];
    }
}