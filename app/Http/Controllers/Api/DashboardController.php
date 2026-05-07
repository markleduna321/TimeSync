<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceCorrection;
use App\Models\Payslip;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Admin KPI summary card data.
     */
    public function adminKpis(): JsonResponse
    {
        $this->authorizeAdmin();

        $now         = Carbon::now();
        $monthStart  = $now->copy()->startOfMonth();
        $monthEnd    = $now->copy()->endOfMonth();

        // Workforce headcount (all non-soft-deleted users)
        $totalEmployees = User::count();

        // Current month payroll totals (any payslip whose period_start falls this month)
        $payrollTotals = Payslip::whereBetween('period_start', [$monthStart, $monthEnd])
            ->selectRaw('SUM(gross_pay) as gross_total, SUM(net_pay) as net_total')
            ->first();

        $grossTotal = (float) ($payrollTotals->gross_total ?? 0);
        $netTotal   = (float) ($payrollTotals->net_total ?? 0);

        // Draft payslips awaiting release
        $draftPayslips = Payslip::where('status', 'draft')->count();

        // Pending attendance corrections
        $pendingCorrections = AttendanceCorrection::where('status', 'pending')->count();

        // Attendance rate this month — ratio of distinct users who clocked in
        // vs total expected workforce (users with employee role)
        $workedThisMonth = DB::table('time_logs')
            ->whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->whereNotNull('clock_in')
            ->distinct('user_id')
            ->count('user_id');

        $employeeCount = User::whereHas('roles', fn ($q) => $q->whereIn('slug', ['employee', 'team_lead', 'manager']))->count();

        $attendanceRate = $employeeCount > 0
            ? round(($workedThisMonth / $employeeCount) * 100, 1)
            : 0;

        return response()->json([
            'total_employees'     => $totalEmployees,
            'gross_total'         => $grossTotal,
            'net_total'           => $netTotal,
            'draft_payslips'      => $draftPayslips,
            'pending_corrections' => $pendingCorrections,
            'attendance_rate'     => $attendanceRate,
        ]);
    }

    /**
     * Recent activity feed for the admin dashboard.
     */
    public function adminActivity(): JsonResponse
    {
        $this->authorizeAdmin();

        // Last 5 released payslips
        $recentPayslips = Payslip::with('user:id,first_name,middle_name,last_name')
            ->where('status', 'released')
            ->orderByDesc('released_at')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id'          => $p->id,
                'name'        => $p->user?->name ?? 'Unknown',
                'net_pay'     => (float) $p->net_pay,
                'gross_pay'   => (float) $p->gross_pay,
                'cutoff_type' => $p->cutoff_type,
                'period_start'=> $p->period_start?->toDateString(),
                'period_end'  => $p->period_end?->toDateString(),
                'released_at' => $p->released_at?->toDateString(),
            ]);

        // Last 5 pending corrections
        $pendingCorrections = AttendanceCorrection::with('user:id,first_name,middle_name,last_name')
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($c) => [
                'id'     => $c->id,
                'name'   => $c->user?->name ?? 'Unknown',
                'date'   => $c->date?->toDateString(),
                'type'   => $c->type,
                'reason' => $c->reason,
            ]);

        return response()->json([
            'recent_payslips'     => $recentPayslips,
            'pending_corrections' => $pendingCorrections,
        ]);
    }

    private function authorizeAdmin(): void
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        abort_unless($user->hasAnyRole(['super_admin', 'admin']), 403, 'Unauthorized.');
    }

    /**
     * Employee KPI data: monthly earnings, attendance rate, team-online count.
     */
    public function employeeKpis(): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user       = auth()->user();
        $now        = Carbon::now();
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd   = $now->copy()->endOfMonth()->toDateString();

        // -- Monthly earnings: sum net_pay of released payslips this month --
        $monthlyEarnings = Payslip::where('user_id', $user->id)
            ->where('status', 'released')
            ->whereBetween('period_start', [$monthStart, $monthEnd])
            ->sum('net_pay');

        // -- Attendance rate: days clocked in / working days elapsed this month --
        $allLogs = TimeLog::where('user_id', $user->id)
            ->whereBetween('date', [$monthStart, $monthEnd])
            ->get();

        $totalDays    = $allLogs->count();
        $presentDays  = $allLogs->filter(fn ($l) => ! empty($l->clock_in))->count();
        $attendanceRate = $totalDays > 0
            ? round(($presentDays / $totalDays) * 100, 1)
            : null;

        // -- Team online: teammates who have an open clock_in today --
        $teamMemberIds = $user->teams()
            ->with('members:id')
            ->get()
            ->flatMap(fn ($t) => $t->members->pluck('id'))
            ->unique()
            ->reject(fn ($id) => $id === $user->id)
            ->values();

        $teamOnline = 0;
        if ($teamMemberIds->isNotEmpty()) {
            $teamOnline = TimeLog::whereIn('user_id', $teamMemberIds)
                ->where('date', today())
                ->whereNotNull('clock_in')
                ->count();
        }

        return response()->json([
            'monthly_earnings' => (float) $monthlyEarnings,
            'attendance_rate'  => $attendanceRate,
            'team_online'      => $teamOnline,
            'total_days'       => $totalDays,
            'present_days'     => $presentDays,
        ]);
    }
}
