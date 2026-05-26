<?php

namespace App\Services;

use App\Models\LeaveApplication;
use App\Models\LeaveCredit;
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

    /**
     * Leave utilization report — credits vs. usage per employee per leave type.
     */
    public function leaveUtilization(int $year, ?int $month = null): array
    {
        // All assigned credits for the year
        $credits = LeaveCredit::with(['user', 'leaveType'])
            ->where('year', $year)
            ->get();

        // All applications within the year (optionally filtered by month of start_date)
        $appQuery = LeaveApplication::whereYear('start_date', $year);
        if ($month) {
            $appQuery->whereMonth('start_date', $month);
        }
        $applications = $appQuery->get();

        // Group applications by user_id + leave_type_id for fast lookup
        $appsByKey = $applications->groupBy(fn ($a) => "{$a->user_id}_{$a->leave_type_id}");

        $rows = $credits->map(function ($credit) use ($appsByKey) {
            $key  = "{$credit->user_id}_{$credit->leave_type_id}";
            $apps = $appsByKey[$key] ?? collect();

            $totalAllocated = (float) $credit->total_credits + (float) $credit->carried_over;
            $used           = (float) $credit->used_credits;
            $balance        = $totalAllocated - $used;
            $utilizationPct = $totalAllocated > 0
                ? round($used / $totalAllocated * 100, 1)
                : 0.0;

            return [
                'user_id'          => $credit->user_id,
                'user_name'        => $credit->user?->name ?? '—',
                'leave_type_id'    => $credit->leave_type_id,
                'leave_type_name'  => $credit->leaveType?->name ?? '—',
                'leave_type_color' => $credit->leaveType?->color ?? '#6B7280',
                'is_paid'          => (bool) ($credit->leaveType?->is_paid ?? false),
                'total_credits'    => (float) $credit->total_credits,
                'carried_over'     => (float) $credit->carried_over,
                'used_credits'     => round($used, 2),
                'balance'          => round($balance, 2),
                'utilization_pct'  => $utilizationPct,
                'filed'            => $apps->count(),
                'approved'         => $apps->where('status', 'approved')->count(),
                'rejected'         => $apps->where('status', 'rejected')->count(),
                'cancelled'        => $apps->where('status', 'cancelled')->count(),
                'pending'          => $apps->where('status', 'pending')->count(),
            ];
        })->values()->all();

        // Aggregate per leave type
        $byType = $credits->groupBy('leave_type_id')->map(function ($typeCredits, $leaveTypeId) use ($applications) {
            $typeApps  = $applications->where('leave_type_id', $leaveTypeId);
            $leaveType = $typeCredits->first()->leaveType;

            return [
                'leave_type_id'   => $leaveTypeId,
                'leave_type_name' => $leaveType?->name ?? '—',
                'color'           => $leaveType?->color ?? '#6B7280',
                'is_paid'         => (bool) ($leaveType?->is_paid ?? false),
                'total_filed'     => $typeApps->count(),
                'approved'        => $typeApps->where('status', 'approved')->count(),
                'rejected'        => $typeApps->where('status', 'rejected')->count(),
                'cancelled'       => $typeApps->where('status', 'cancelled')->count(),
                'pending'         => $typeApps->where('status', 'pending')->count(),
                'total_days_used' => round($typeApps->where('status', 'approved')->sum('days_requested'), 2),
            ];
        })->values()->all();

        return [
            'rows'    => $rows,
            'by_type' => $byType,
            'summary' => [
                'total_employees'    => collect($rows)->pluck('user_id')->unique()->count(),
                'total_applications' => $applications->count(),
                'approved'           => $applications->where('status', 'approved')->count(),
                'rejected'           => $applications->where('status', 'rejected')->count(),
                'cancelled'          => $applications->where('status', 'cancelled')->count(),
                'pending'            => $applications->where('status', 'pending')->count(),
                'total_days_used'    => round($applications->where('status', 'approved')->sum('days_requested'), 2),
            ],
        ];
    }
}
