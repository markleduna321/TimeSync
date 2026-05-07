<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OpenAiService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        private ReportService $reports,
        private OpenAiService $ai,
    ) {}

    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->hasAnyRole(['super_admin', 'admin', 'manager']),
            403,
            'Unauthorized.'
        );
    }

    public function payrollSummary(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $year       = (int) $request->query('year', now()->year);
        $month      = $request->filled('month') ? (int) $request->query('month') : null;
        $cutoffType = $request->filled('cutoff_type') ? $request->query('cutoff_type') : null;

        return response()->json($this->reports->payrollSummary($year, $month, $cutoffType));
    }

    public function payrollTrend(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $year = (int) $request->query('year', now()->year);

        return response()->json($this->reports->payrollTrend($year));
    }

    public function attendanceSummary(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $year  = (int) $request->query('year', now()->year);
        $month = $request->filled('month') ? (int) $request->query('month') : null;

        return response()->json($this->reports->attendanceSummary($year, $month));
    }

    public function contributionsSummary(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $year  = (int) $request->query('year', now()->year);
        $month = $request->filled('month') ? (int) $request->query('month') : null;

        return response()->json($this->reports->contributionsSummary($year, $month));
    }

    public function departmentPayroll(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $year  = (int) $request->query('year', now()->year);
        $month = $request->filled('month') ? (int) $request->query('month') : null;

        return response()->json($this->reports->departmentPayroll($year, $month));
    }

    public function aiInsights(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'report_type' => 'required|string|in:payroll_summary,payroll_trend,attendance,contributions,department_payroll',
            'data'        => 'required|array',
        ]);

        try {
            $insight = $this->ai->analyze($request->report_type, $request->data);
            return response()->json(['insight' => $insight]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }
}
