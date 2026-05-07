<?php

namespace App\Services;

use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\TimeLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Per-employee payslip summary with optional filters.
     */
    public function payrollSummary(int $year, ?int $month = null, ?string $cutoffType = null): array
    {
        $query = Payslip::with('user')
            ->whereYear('period_start', $year);

        if ($month) {
            $query->whereMonth('period_start', $month);
        }
        if ($cutoffType) {
            $query->where('cutoff_type', $cutoffType);
        }

        $payslips = $query->orderBy('period_start')->get();

        $rows = $payslips->map(fn ($p) => [
            'id'               => $p->id,
            'employee_id'      => $p->user_id,
            'employee_name'    => $p->user?->name ?? '—',
            'period_start'     => $p->period_start?->format('Y-m-d'),
            'period_end'       => $p->period_end?->format('Y-m-d'),
            'cutoff_type'      => $p->cutoff_type,
            'status'           => $p->status,
            'monthly_salary'   => (float) $p->monthly_salary,
            'basic_pay'        => (float) $p->basic_pay,
            'gross_pay'        => (float) $p->gross_pay,
            'total_deductions' => (float) $p->total_deductions,
            'net_pay'          => (float) $p->net_pay,
            'days_worked'      => $p->days_worked,
            'days_absent'      => $p->days_absent,
        ])->values()->all();

        return [
            'rows'              => $rows,
            'total_gross'       => round($payslips->sum('gross_pay'), 2),
            'total_deductions'  => round($payslips->sum('total_deductions'), 2),
            'total_net'         => round($payslips->sum('net_pay'), 2),
            'headcount'         => $payslips->pluck('user_id')->unique()->count(),
        ];
    }

    /**
     * 12-month payroll trend buckets for a given year.
     */
    public function payrollTrend(int $year): array
    {
        $rows = Payslip::selectRaw(
                'MONTH(period_start) as month,
                 SUM(gross_pay) as total_gross,
                 SUM(total_deductions) as total_deductions,
                 SUM(net_pay) as total_net,
                 COUNT(*) as payslip_count'
            )
            ->whereYear('period_start', $year)
            ->groupByRaw('MONTH(period_start)')
            ->orderByRaw('MONTH(period_start)')
            ->get();

        $months = collect(range(1, 12))->map(function ($m) use ($rows) {
            $found = $rows->firstWhere('month', $m);
            return [
                'month'             => $m,
                'month_name'        => date('F', mktime(0, 0, 0, $m, 1)),
                'total_gross'       => $found ? round((float) $found->total_gross, 2) : 0.0,
                'total_deductions'  => $found ? round((float) $found->total_deductions, 2) : 0.0,
                'total_net'         => $found ? round((float) $found->total_net, 2) : 0.0,
                'payslip_count'     => $found ? (int) $found->payslip_count : 0,
            ];
        });

        return [
            'year' => $year,
            'rows' => $months->all(),
        ];
    }

    /**
     * Per-employee attendance summary.
     */
    public function attendanceSummary(int $year, ?int $month = null): array
    {
        $query = Payslip::with('user')
            ->whereYear('period_start', $year);

        if ($month) {
            $query->whereMonth('period_start', $month);
        }

        $payslips = $query->get();

        // Aggregate per user
        $byUser = $payslips->groupBy('user_id')->map(function ($group) {
            $user = $group->first()->user;
            return [
                'employee_id'      => $group->first()->user_id,
                'employee_name'    => $user?->name ?? '—',
                'days_scheduled'   => $group->sum('days_scheduled'),
                'days_worked'      => $group->sum('days_worked'),
                'days_absent'      => $group->sum('days_absent'),
                'late_minutes'     => $group->sum('late_minutes'),
                'undertime_minutes'=> $group->sum('undertime_minutes'),
                'ot_minutes'       => $group->sum('ot_minutes'),
                'rest_day_minutes' => $group->sum('rest_day_minutes'),
                'attendance_rate'  => $group->sum('days_scheduled') > 0
                    ? round(($group->sum('days_worked') / $group->sum('days_scheduled')) * 100, 1)
                    : 0,
            ];
        })->values()->all();

        return [
            'rows'                    => $byUser,
            'total_days_scheduled'    => array_sum(array_column($byUser, 'days_scheduled')),
            'total_days_worked'       => array_sum(array_column($byUser, 'days_worked')),
            'total_days_absent'       => array_sum(array_column($byUser, 'days_absent')),
            'total_late_minutes'      => array_sum(array_column($byUser, 'late_minutes')),
            'total_ot_minutes'        => array_sum(array_column($byUser, 'ot_minutes')),
        ];
    }

    /**
     * Government contributions breakdown per period.
     */
    public function contributionsSummary(int $year, ?int $month = null): array
    {
        $payslipQuery = Payslip::whereYear('period_start', $year);
        if ($month) {
            $payslipQuery->whereMonth('period_start', $month);
        }
        $payslipIds = $payslipQuery->pluck('id');

        $codes = ['SSS', 'SSS_WISP', 'PHILHEALTH', 'PAGIBIG', 'WITHHOLDING_TAX'];

        $lines = PayslipLine::whereIn('payslip_id', $payslipIds)
            ->whereIn('code', $codes)
            ->where('category', 'deduction')
            ->selectRaw('code, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('code')
            ->pluck('total', 'code');

        $rows = [];
        $labels = [
            'SSS'             => 'SSS Contribution',
            'SSS_WISP'        => 'SSS WISP (Provident)',
            'PHILHEALTH'      => 'PhilHealth Contribution',
            'PAGIBIG'         => 'Pag-IBIG Contribution',
            'WITHHOLDING_TAX' => 'Withholding Tax',
        ];

        foreach ($codes as $code) {
            $rows[] = [
                'code'        => $code,
                'label'       => $labels[$code],
                'total'       => round((float) ($lines[$code] ?? 0), 2),
            ];
        }

        // Per-period breakdown (for chart)
        $periodRows = PayslipLine::selectRaw(
                'payslip_lines.code,
                 DATE_FORMAT(payslips.period_start, "%Y-%m") as period_month,
                 SUM(payslip_lines.amount) as total'
            )
            ->join('payslips', 'payslips.id', '=', 'payslip_lines.payslip_id')
            ->whereIn('payslip_lines.payslip_id', $payslipIds)
            ->whereIn('payslip_lines.code', $codes)
            ->where('payslip_lines.category', 'deduction')
            ->groupByRaw('payslip_lines.code, DATE_FORMAT(payslips.period_start, "%Y-%m")')
            ->orderByRaw('period_month')
            ->get()
            ->groupBy('period_month')
            ->map(fn ($g) => $g->pluck('total', 'code')->toArray())
            ->toArray();

        return [
            'summary'      => $rows,
            'by_period'    => $periodRows,
            'grand_total'  => round(array_sum(array_column($rows, 'total')), 2),
        ];
    }

    /**
     * Per-department payroll aggregates.
     */
    public function departmentPayroll(int $year, ?int $month = null): array
    {
        $query = Payslip::with('user.department')
            ->whereYear('period_start', $year);

        if ($month) {
            $query->whereMonth('period_start', $month);
        }

        $payslips = $query->get();

        $byDept = $payslips->groupBy(fn ($p) => $p->user?->department_id ?? 0)
            ->map(function ($group) {
                $dept = $group->first()->user?->department;
                return [
                    'department_id'    => $group->first()->user?->department_id,
                    'department_name'  => $dept?->name ?? 'No Department',
                    'headcount'        => $group->pluck('user_id')->unique()->count(),
                    'total_gross'      => round($group->sum('gross_pay'), 2),
                    'total_deductions' => round($group->sum('total_deductions'), 2),
                    'total_net'        => round($group->sum('net_pay'), 2),
                    'avg_net'          => $group->pluck('user_id')->unique()->count() > 0
                        ? round($group->sum('net_pay') / $group->pluck('user_id')->unique()->count(), 2)
                        : 0,
                ];
            })->values()->all();

        usort($byDept, fn ($a, $b) => $b['total_net'] <=> $a['total_net']);

        return [
            'rows'        => $byDept,
            'total_gross' => round(array_sum(array_column($byDept, 'total_gross')), 2),
            'total_net'   => round(array_sum(array_column($byDept, 'total_net')), 2),
        ];
    }
}
