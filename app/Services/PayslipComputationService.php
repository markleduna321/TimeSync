<?php

namespace App\Services;

use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\TimeLog;
use App\Models\UserAllowance;
use App\Models\UserDeduction;
use App\Models\UserGovernmentDeductionSetting;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

/**
 * Philippine-government-compliant payslip computation service.
 *
 * References:
 * - SSS: Circular 2023-005 (contribution table)
 * - PhilHealth: PhilHealth Circular 2024-0005 (5% total; employee 2.5%)
 * - Pag-IBIG: RA 9679 (employee share capped 100/month)
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
        return round(min(100.0, $monthlySalary * $rate), 2);
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

    public function computeHolidayExtra(float $dailyRate, string $holidayType, bool $worked): float
    {
        if ($holidayType === 'regular' && !$worked) return round($dailyRate, 2);
        if ($holidayType === 'regular' && $worked)  return round($dailyRate, 2);
        if ($holidayType === 'special' && $worked)  return round($dailyRate * 0.30, 2);
        return 0.0;
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
        $schedule    = $employee->schedule;
        $workDays    = $schedule?->work_days ?? [];
        $shiftStart  = $schedule?->shift_start ?? '08:00';
        $shiftEnd    = $schedule?->shift_end   ?? '17:00';
        $daysPerWeek = count($workDays);
        $dailyRate   = $this->computeDailyRate($monthlySalary, $daysPerWeek);

        // Break config for over-break deduction
        $employee->loadMissing('breakConfig');
        $breakConfig      = $employee->breakConfig;
        $allowedBreakMins = $breakConfig
            ? ($breakConfig->break_count * $breakConfig->break_duration_minutes)
            : 0;
        $allowedLunchMins = $breakConfig ? $breakConfig->lunch_duration_minutes : 60;

        $logs = TimeLog::where('user_id', $employee->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()->keyBy(fn($l) => $l->date->format('Y-m-d'));

        $holidays = Holiday::whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()->keyBy(fn($h) => $h->date->format('Y-m-d'));

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

        foreach (CarbonPeriod::create($periodStart, $periodEnd) as $cursor) {
            $dateStr   = $cursor->toDateString();
            $isWorkDay = in_array($cursor->format('D'), $workDays)
                      || in_array(strtolower($cursor->englishDayOfWeek), $workDays);
            $holiday = $holidays[$dateStr] ?? null;
            $log     = $logs[$dateStr] ?? null;
            $worked  = $log && $log->clock_in;

            if (!$isWorkDay && !$holiday) {
                // Pure rest day — track if employee actually worked
                if ($worked) {
                    $workedMins = (int)($log->total_worked_minutes ?? 0);
                    if ($workedMins > 0) {
                        $rdRegular     = min($workedMins, 480);
                        $rdOt          = max(0, $workedMins - 480);
                        $restDayMinutes   += $rdRegular;
                        $restDayOtMinutes += $rdOt;
                        $restDayPay    += $this->computeRestDayPay($dailyRate, $rdRegular);
                        $restDayOtPay  += $this->computeRestDayOtPay($dailyRate, $rdOt);
                    }
                }
                continue;
            }

            if (!$isWorkDay && $holiday) {
                // Holiday that falls on the employee's rest day.
                // Under Flat Rate, basic_pay already covers the half-month, so
                // do NOT add an extra holiday pay on top.
                // Under Days-Worked, we still need to add the holiday's daily
                // rate (employee is paid for the holiday even though it is
                // their rest day, per Labor Code Art. 94).
                if ($method === 'days_worked') {
                    if (!$worked) {
                        $holidayPayExtra += $this->computeHolidayExtra($dailyRate, $holiday->type, false);
                    } else {
                        $daysWorked++;
                        $holidayPayExtra += $this->computeHolidayExtra($dailyRate, $holiday->type, true);
                    }
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
            if ($holiday) {
                $holidayDaysWorked++;
                $holidayPayExtra += $this->computeHolidayExtra($dailyRate, $holiday->type, true);
            }

            $shiftCarbon = Carbon::parse($dateStr . ' ' . $shiftStart);
            $clockIn     = Carbon::parse($log->clock_in);
            if ($clockIn->gt($shiftCarbon)) {
                $lateMinutes += (int)$shiftCarbon->diffInMinutes($clockIn);
            }

            if ($log->clock_out) {
                $shiftEndC  = Carbon::parse($dateStr . ' ' . $shiftEnd);
                $clockOutC  = Carbon::parse($log->clock_out);
                $diff = $shiftEndC->diffInMinutes($clockOutC, false);
                if ($diff < 0) $undertimeMins += (int)abs($diff);
            }

            if ($log->overtime_minutes ?? 0) {
                $otMins = (int)$log->overtime_minutes;
                $otMinutes += $otMins;
                $overtimePay += $this->computeOvertimePay($dailyRate, $otMins, (bool)$holiday);
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
            $absentDeduction = round($daysAbsent * $dailyRate, 2);
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
        if ($holidayPayExtra > 0) {
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
                'paid_leave_days'     => $paidLeaveDays,
                'unpaid_leave_days'   => $unpaidLeaveDays,
                'holiday_days'        => $holidayDays,
                'holiday_days_worked' => $holidayDaysWorked,
                'late_minutes'        => $lateMinutes,
                'undertime_minutes'   => $undertimeMins,
                'over_break_minutes'  => $overBreakMins,
                'ot_minutes'          => $otMinutes,
                'rest_day_minutes'    => $restDayMinutes,
                'rest_day_ot_minutes' => $restDayOtMinutes,
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