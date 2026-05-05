<?php

namespace App\Services;

use App\Models\Holiday;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\TimeLog;
use App\Models\UserAllowance;
use App\Models\UserDeduction;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

/**
 * Philippine-government-compliant payslip computation service.
 *
 * References:
 *  - SSS: Circular 2023-005 (contribution table)
 *  - PhilHealth: PhilHealth Circular 2024-0005 (5% total; employee 2.5%)
 *  - Pag-IBIG: RA 9679 (employee share capped 100/month)
 *  - Withholding Tax: TRAIN Law (RA 10963)
 *    - 1st cutoff: semi-monthly BIR table (annual / 24)
 *    - 2nd cutoff: cumulative monthly adjustment (Monthly table - 1st cutoff WHT)
 *  - SSS WISP: mandatory provident fund for MSC > 20000 (100/month, split 50/cutoff)
 *  - De minimis: BIR RR 11-2018 / RMC 50-2018
 *  - 13th Month: PD 851; first 90000 non-taxable (TRAIN)
 *  - Holiday pay: Labor Code Arts. 93-94
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
       [20250,  21249.99,  945.00, 100],
       [21250,  22249.99,  990.00, 100],
       [22250,  23249.99, 1035.00, 100],
       [23250,  24249.99, 1080.00, 100],
       [24250,  25249.99, 1125.00, 100],
       [25250,  26249.99, 1170.00, 100],
       [26250,  27249.99, 1215.00, 100],
       [27250,  28249.99, 1260.00, 100],
       [28250,  29249.99, 1305.00, 100],
       [29250,  30000.00, 1350.00, 100],
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

    public function computeOvertimePay(float $dailyRate, int $overtimeMinutes, bool $isHoliday = false): float
    {
        if ($overtimeMinutes <= 0) return 0.0;
        $multiplier = $isHoliday ? 1.30 * 1.25 : 1.25;
        return round(($dailyRate / 8.0) * $multiplier * ($overtimeMinutes / 60.0), 2);
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
        string $incentiveDescription = 'Incentive / Bonus'
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

        $logs = TimeLog::where('user_id', $employee->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()->keyBy(fn($l) => $l->date->format('Y-m-d'));

        $holidays = Holiday::whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()->keyBy(fn($h) => $h->date->format('Y-m-d'));

        $daysScheduled = $daysWorked = $daysAbsent = $lateMinutes = $undertimeMins = 0;
        $holidayPayExtra = $overtimePay = 0.0;

        foreach (CarbonPeriod::create($periodStart, $periodEnd) as $cursor) {
            $dateStr   = $cursor->toDateString();
            $isWorkDay = in_array($cursor->format('D'), $workDays)
                      || in_array(strtolower($cursor->englishDayOfWeek), $workDays);
            $holiday = $holidays[$dateStr] ?? null;
            $log     = $logs[$dateStr] ?? null;
            $worked  = $log && $log->clock_in;

            if (!$isWorkDay && !$holiday) continue;

            if (!$isWorkDay && $holiday) {
                if (!$worked) {
                    $holidayPayExtra += $this->computeHolidayExtra($dailyRate, $holiday->type, false);
                } else {
                    $daysWorked++;
                    $holidayPayExtra += $this->computeHolidayExtra($dailyRate, $holiday->type, true);
                }
                continue;
            }

            $daysScheduled++;
            if (!$worked) {
                if ($holiday && $holiday->type === 'regular') {
                    $holidayPayExtra += $this->computeHolidayExtra($dailyRate, 'regular', false);
                } else {
                    $daysAbsent++;
                }
                continue;
            }

            $daysWorked++;
            if ($holiday) {
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
                $overtimePay += $this->computeOvertimePay($dailyRate, (int)$log->overtime_minutes, (bool)$holiday);
            }
        }

        $basicPay      = round($daysWorked * $dailyRate, 2);
        $lateDeduction = $this->computeLateDeduction($dailyRate, $lateMinutes);
        $utDeduction   = $this->computeUndertimeDeduction($dailyRate, $undertimeMins);

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
            $earnings[] = ['code' => 'OVERTIME',    'description' => 'Overtime Pay', 'sort_order' => $sort++, 'amount' => $overtimePay, 'is_taxable' => true];
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
        $grossTaxable         = max(0.0, $grossTaxableEarnings - $lateDeduction - $utDeduction);
        $grossPay             = collect($earnings)->sum('amount');
        $semiMonthlyTaxable   = max(0.0, $grossTaxable - $govtHalf);

        if ($cutoffType === 'first') {
            $wht = $this->computeWithholdingTaxSemiMonthly($semiMonthlyTaxable);
        } else {
            $firstPayslip = Payslip::where('user_id', $employee->id)
                ->where('cutoff_type', 'first')
                ->whereYear('period_end', $periodEnd->year)
                ->whereMonth('period_end', $periodEnd->month)
                ->latest('period_end')->first();

            $firstTaxable = (float)($firstPayslip?->taxable_income ?? 0.0);
            $firstWht     = $firstPayslip
                ? (float)(PayslipLine::where('payslip_id', $firstPayslip->id)->where('code', 'WITHHOLDING_TAX')->value('amount') ?? 0.0)
                : 0.0;

            $monthlyTaxable  = $firstTaxable + $semiMonthlyTaxable;
            $totalMonthlyWht = $this->computeWithholdingTaxMonthly($monthlyTaxable);
            $wht             = max(0.0, round($totalMonthlyWht - $firstWht, 2));
        }

        $deductions = [];
        $dsort = 0;

        $deductions[] = ['code' => 'SSS',        'description' => 'SSS Contribution',        'sort_order' => $dsort++, 'amount' => $sssHalf,        'is_taxable' => false];
        if ($wispHalf > 0) {
            $deductions[] = ['code' => 'SSS_WISP', 'description' => 'SSS WISP (Provident)',  'sort_order' => $dsort++, 'amount' => $wispHalf,        'is_taxable' => false];
        }
        $deductions[] = ['code' => 'PHILHEALTH',  'description' => 'PhilHealth Contribution', 'sort_order' => $dsort++, 'amount' => $philhealthHalf, 'is_taxable' => false];
        $deductions[] = ['code' => 'PAGIBIG',      'description' => 'Pag-IBIG Contribution',  'sort_order' => $dsort++, 'amount' => $pagibigHalf,    'is_taxable' => false];
        $deductions[] = [
            'code'        => 'WITHHOLDING_TAX',
            'description' => $cutoffType === 'first'
                ? 'Withholding Tax — Semi-Monthly (TRAIN)'
                : 'Withholding Tax — Cumulative Adjustment (TRAIN)',
            'sort_order'  => $dsort++,
            'amount'      => $wht,
            'is_taxable'  => false,
        ];

        if ($lateDeduction > 0) {
            $deductions[] = ['code' => 'LATE',      'description' => 'Late Deduction',      'sort_order' => $dsort++, 'amount' => $lateDeduction, 'is_taxable' => false];
        }
        if ($utDeduction > 0) {
            $deductions[] = ['code' => 'UNDERTIME',  'description' => 'Undertime Deduction', 'sort_order' => $dsort++, 'amount' => $utDeduction,   'is_taxable' => false];
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
        $netPay          = round($grossPay - $lateDeduction - $utDeduction - $totalDeductions, 2);

        return [
            'earnings'   => $earnings,
            'deductions' => $deductions,
            'summary'    => [
                'cutoff_type'       => $cutoffType,
                'taxable_income'    => round($semiMonthlyTaxable, 2),
                'monthly_salary'    => $monthlySalary,
                'daily_rate'        => $dailyRate,
                'basic_pay'         => $basicPay,
                'gross_pay'         => round($grossPay, 2),
                'total_deductions'  => $totalDeductions,
                'net_pay'           => $netPay,
                'days_scheduled'    => $daysScheduled,
                'days_worked'       => $daysWorked,
                'days_absent'       => $daysAbsent,
                'late_minutes'      => $lateMinutes,
                'undertime_minutes' => $undertimeMins,
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
