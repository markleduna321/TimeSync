<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GeneratePayslipRequest;
use App\Http\Resources\PayslipResource;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\User;
use App\Services\PayslipComputationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PayslipController extends Controller
{
    public function __construct(private PayslipComputationService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Payslip::class);

        $isAdmin = $request->user()->hasAnyRole(['super_admin', 'admin', 'manager']);
        $userId  = $isAdmin
            ? $request->query('user_id')
            : $request->user()->id;

        $query = Payslip::with('user', 'generatedBy')
            ->orderByDesc('period_start');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if (! $isAdmin) {
            // Employees see only released payslips
            $query->where('status', 'released');
        }

        if ($request->filled('year')) {
            $query->whereYear('period_start', $request->query('year'));
        }

        return PayslipResource::collection($query->paginate(20));
    }

    public function show(Payslip $payslip): PayslipResource
    {
        $this->authorize('view', $payslip);

        $payslip->load('user', 'generatedBy', 'lines');

        return new PayslipResource($payslip);
    }

    public function generate(GeneratePayslipRequest $request): PayslipResource
    {
        $this->authorize('create', Payslip::class);

        $employee    = User::with('schedule')->findOrFail($request->user_id);
        $periodStart = Carbon::parse($request->period_start);
        $periodEnd   = Carbon::parse($request->period_end);

        // Guard: no duplicate period for same employee
        $existing = Payslip::where('user_id', $employee->id)
            ->where('period_start', $periodStart->toDateString())
            ->where('period_end', $periodEnd->toDateString())
            ->first();

        if ($existing) {
            return abort(422, 'A payslip for this employee and period already exists.');
        }

        $result = $this->service->compute(
            $employee,
            $periodStart,
            $periodEnd,
            (float) ($request->incentive_amount ?? 0.0),
            (string) ($request->incentive_description ?? 'Incentive / Bonus')
        );
        $s = $result['summary'];

        $payslip = Payslip::create([
            'user_id'          => $employee->id,
            'period_start'     => $periodStart->toDateString(),
            'period_end'       => $periodEnd->toDateString(),
            'pay_date'         => $request->pay_date,
            'monthly_salary'   => $s['monthly_salary'],
            'daily_rate'       => $s['daily_rate'],
            'basic_pay'        => $s['basic_pay'],
            'gross_pay'        => $s['gross_pay'],
            'total_deductions' => $s['total_deductions'],
            'net_pay'          => $s['net_pay'],
            'days_scheduled'   => $s['days_scheduled'],
            'days_worked'      => $s['days_worked'],
            'days_absent'      => $s['days_absent'],
            'late_minutes'     => $s['late_minutes'],
            'undertime_minutes'=> $s['undertime_minutes'],
            'status'           => 'draft',
            'cutoff_type'      => $s['cutoff_type'],
            'taxable_income'   => $s['taxable_income'],
            'generated_by'     => $request->user()->id,
        ]);

        // Persist lines
        foreach ($result['earnings'] as $line) {
            PayslipLine::create(array_merge($line, ['payslip_id' => $payslip->id, 'category' => 'earning']));
        }
        foreach ($result['deductions'] as $line) {
            PayslipLine::create(array_merge($line, ['payslip_id' => $payslip->id, 'category' => 'deduction']));
        }

        $payslip->load('user', 'generatedBy', 'lines');

        return new PayslipResource($payslip);
    }

    public function release(Payslip $payslip): PayslipResource
    {
        $this->authorize('update', $payslip);

        $payslip->update([
            'status'      => 'released',
            'released_at' => now(),
        ]);

        $payslip->load('user', 'generatedBy', 'lines');

        return new PayslipResource($payslip);
    }

    public function destroy(Payslip $payslip): JsonResponse
    {
        $this->authorize('delete', $payslip);

        $payslip->delete();

        return response()->json(null, 204);
    }

    public function thirteenthMonth(Request $request): JsonResponse
    {
        $this->authorize('create', Payslip::class);

        $employee = User::findOrFail($request->query('user_id', $request->user()->id));
        $year     = (int) $request->query('year', now()->year);

        $result = $this->service->computeAnnual13thMonth($employee, $year);

        return response()->json($result);
    }
}
