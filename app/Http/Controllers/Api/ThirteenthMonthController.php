<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateThirteenthMonthRequest;
use App\Http\Resources\PayslipResource;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\User;
use App\Notifications\PayslipDraftedNotification;
use App\Services\PayslipComputationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Notification;

class ThirteenthMonthController extends Controller
{
    public function __construct(private PayslipComputationService $service) {}

    /**
     * GET /api/13th-month?year=2025
     * List all 13th month payslips for the given year (admin).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Payslip::class);

        $year = (int) $request->query('year', now()->year);

        $payslips = Payslip::with('user', 'generatedBy', 'lines')
            ->where('cutoff_type', '13th_month')
            ->whereYear('period_start', $year)
            ->orderBy('created_at', 'desc')
            ->get();

        return PayslipResource::collection($payslips);
    }

    /**
     * POST /api/13th-month/generate
     * Bulk-generate 13th month draft payslips for all eligible employees.
     */
    public function generate(GenerateThirteenthMonthRequest $request): JsonResponse
    {
        $this->authorize('create', Payslip::class);

        $year     = (int) $request->year;
        $payDate  = $request->pay_date;
        $operator = $request->user();

        $employees = User::with('schedule')
            ->where('monthly_salary', '>', 0)
            ->get();

        $generated = 0;
        $skipped   = 0;
        $errors    = [];

        foreach ($employees as $employee) {
            // Skip if already generated for this year
            $exists = Payslip::where('user_id', $employee->id)
                ->where('cutoff_type', '13th_month')
                ->whereYear('period_start', $year)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            $result = $this->service->computeAnnual13thMonth($employee, $year);

            if ($result['amount'] <= 0) {
                $errors[] = "{$employee->name}: no released payslips for {$year} — skipped.";
                $skipped++;
                continue;
            }

            $amount     = (float) $result['amount'];
            $nonTaxable = (float) $result['non_taxable'];
            $taxable    = (float) $result['taxable_amount'];
            $sumBasic   = (float) $result['sum_basic_pay'];

            $payslip = Payslip::create([
                'user_id'             => $employee->id,
                'period_start'        => "{$year}-01-01",
                'period_end'          => "{$year}-12-31",
                'pay_date'            => $payDate,
                'monthly_salary'      => $employee->monthly_salary,
                'daily_rate'          => 0,
                'basic_pay'           => $amount,
                'gross_pay'           => $amount,
                'total_deductions'    => 0,
                'net_pay'             => $amount,
                'days_scheduled'      => 0,
                'days_worked'         => 0,
                'days_absent'         => 0,
                'late_minutes'        => 0,
                'undertime_minutes'   => 0,
                'over_break_minutes'  => 0,
                'ot_minutes'          => 0,
                'rest_day_minutes'    => 0,
                'rest_day_ot_minutes' => 0,
                'taxable_income'      => $taxable,
                'status'              => 'draft',
                'cutoff_type'         => '13th_month',
                'generated_by'        => $operator->id,
            ]);

            // Earnings lines
            PayslipLine::create([
                'payslip_id'  => $payslip->id,
                'category'    => 'earning',
                'code'        => '13TH_NONTAX',
                'description' => "13th Month Pay — Non-Taxable (₱90,000 exemption per TRAIN Law)",
                'sort_order'  => 1,
                'amount'      => $nonTaxable,
                'is_taxable'  => false,
            ]);

            if ($taxable > 0) {
                PayslipLine::create([
                    'payslip_id'  => $payslip->id,
                    'category'    => 'earning',
                    'code'        => '13TH_TAXABLE',
                    'description' => "13th Month Pay — Taxable Excess (TRAIN Law; include in Dec WHT)",
                    'sort_order'  => 2,
                    'amount'      => $taxable,
                    'is_taxable'  => true,
                ]);
            }

            $generated++;
        }

        // Notify admins if any were generated
        if ($generated > 0) {
            $admins = User::whereHas('roles', fn ($q) => $q->whereIn('slug', ['super_admin', 'admin']))->get();
            $representative = Payslip::where('cutoff_type', '13th_month')
                ->whereYear('period_start', $year)
                ->latest()->first();
            if ($representative) {
                Notification::send($admins, new PayslipDraftedNotification($representative));
            }
        }

        return response()->json([
            'generated' => $generated,
            'skipped'   => $skipped,
            'errors'    => $errors,
            'message'   => "Generated {$generated} 13th month payslip draft(s). {$skipped} skipped.",
        ]);
    }
}
