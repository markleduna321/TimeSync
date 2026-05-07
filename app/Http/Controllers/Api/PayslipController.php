<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkDraftPayslipRequest;
use App\Http\Requests\BulkReleasePayslipRequest;
use App\Http\Requests\GeneratePayslipRequest;
use App\Http\Resources\PayslipResource;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\User;
use App\Notifications\PayslipDraftedNotification;
use App\Notifications\PayslipReleasedNotification;
use App\Services\PayslipComputationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Notification;

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

        if ($request->filled('year')) {
            $query->whereYear('period_start', $request->query('year'));
        }

        if ($request->filled('month')) {
            $query->whereMonth('period_start', (int) $request->query('month'));
        }

        if ($request->filled('cutoff_type')) {
            $query->where('cutoff_type', $request->query('cutoff_type'));
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
            'late_minutes'        => $s['late_minutes'],
            'undertime_minutes'   => $s['undertime_minutes'],
            'ot_minutes'          => $s['ot_minutes'],
            'rest_day_minutes'    => $s['rest_day_minutes'],
            'rest_day_ot_minutes' => $s['rest_day_ot_minutes'],
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

        // Prior period adjustment — added as a separate earning line, not re-taxed here
        if ($request->filled('prior_period_amount') && (float)$request->prior_period_amount > 0) {
            $ppStart  = $request->prior_period_start;
            $ppEnd    = $request->prior_period_end;
            $ppLabel  = $ppStart && $ppEnd
                ? "Prior Period Adjustment ({$ppStart} – {$ppEnd})"
                : 'Prior Period Adjustment';
            $ppAmount = round((float)$request->prior_period_amount, 2);
            $maxSort  = collect($result['earnings'])->max('sort_order') ?? 0;
            PayslipLine::create([
                'payslip_id'  => $payslip->id,
                'category'    => 'earning',
                'code'        => 'PRIOR_PERIOD',
                'description' => $ppLabel,
                'sort_order'  => $maxSort + 1,
                'amount'      => $ppAmount,
                'is_taxable'  => true,
            ]);
            $payslip->increment('gross_pay', $ppAmount);
            $payslip->increment('net_pay',   $ppAmount);
        }

        $payslip->load('user', 'generatedBy', 'lines');

        // Notify all admins that a draft payslip is ready.
        $admins = User::whereHas('roles', fn ($q) => $q->whereIn('slug', ['super_admin', 'admin']))->get();
        Notification::send($admins, new PayslipDraftedNotification($payslip));

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

        // Notify the employee their payslip is available.
        $payslip->user->notify(new PayslipReleasedNotification($payslip));

        return new PayslipResource($payslip);
    }

    public function bulkRelease(BulkReleasePayslipRequest $request): JsonResponse
    {
        $ids = $request->validated()['payslip_ids'];

        $payslips = Payslip::whereIn('id', $ids)
            ->where('status', 'draft')
            ->with('user')
            ->get();

        foreach ($payslips as $payslip) {
            $this->authorize('update', $payslip);
            $payslip->update([
                'status'      => 'released',
                'released_at' => now(),
            ]);
            // Notify each employee.
            $payslip->user->notify(new PayslipReleasedNotification($payslip));
        }

        return response()->json([
            'released' => $payslips->count(),
            'skipped'  => count($ids) - $payslips->count(),
        ]);
    }

    public function destroy(Payslip $payslip): JsonResponse
    {
        $this->authorize('delete', $payslip);

        $payslip->delete();

        return response()->json(null, 204);
    }

    public function bulkDraft(BulkDraftPayslipRequest $request): JsonResponse
    {
        $this->authorize('create', Payslip::class);

        $periodStart = Carbon::parse($request->period_start);
        $periodEnd   = Carbon::parse($request->period_end);
        $payDate     = $request->pay_date;

        $employees = User::with('schedule')
            ->whereHas('roles', fn ($q) => $q->where('slug', 'employee'))
            ->get();

        $generated = 0;
        $skipped   = 0;

        foreach ($employees as $employee) {
            $exists = Payslip::where('user_id', $employee->id)
                ->where('period_start', $periodStart->toDateString())
                ->where('period_end',   $periodEnd->toDateString())
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            $result = $this->service->compute(
                $employee,
                $periodStart,
                $periodEnd,
                0.0,
                'Incentive / Bonus'
            );
            $s = $result['summary'];

            $payslip = Payslip::create([
                'user_id'           => $employee->id,
                'period_start'      => $periodStart->toDateString(),
                'period_end'        => $periodEnd->toDateString(),
                'pay_date'          => $payDate,
                'monthly_salary'    => $s['monthly_salary'],
                'daily_rate'        => $s['daily_rate'],
                'basic_pay'         => $s['basic_pay'],
                'gross_pay'         => $s['gross_pay'],
                'total_deductions'  => $s['total_deductions'],
                'net_pay'           => $s['net_pay'],
                'days_scheduled'    => $s['days_scheduled'],
                'days_worked'       => $s['days_worked'],
                'days_absent'       => $s['days_absent'],
                'late_minutes'        => $s['late_minutes'],
                'undertime_minutes'   => $s['undertime_minutes'],
                'ot_minutes'          => $s['ot_minutes'],
                'rest_day_minutes'    => $s['rest_day_minutes'],
                'rest_day_ot_minutes' => $s['rest_day_ot_minutes'],
                'status'            => 'draft',
                'cutoff_type'       => $s['cutoff_type'],
                'taxable_income'    => $s['taxable_income'],
                'generated_by'      => $request->user()->id,
            ]);

            foreach ($result['earnings'] as $line) {
                PayslipLine::create(array_merge($line, ['payslip_id' => $payslip->id, 'category' => 'earning']));
            }
            foreach ($result['deductions'] as $line) {
                PayslipLine::create(array_merge($line, ['payslip_id' => $payslip->id, 'category' => 'deduction']));
            }

            $generated++;
        }

        // Notify admins once that bulk drafts were generated.
        if ($generated > 0) {
            $representative = Payslip::where('period_start', $periodStart->toDateString())
                ->where('period_end', $periodEnd->toDateString())
                ->latest()->first();

            if ($representative) {
                $admins = User::whereHas('roles', fn ($q) => $q->whereIn('slug', ['super_admin', 'admin']))->get();
                Notification::send($admins, new PayslipDraftedNotification($representative));
            }
        }

        return response()->json([
            'generated' => $generated,
            'skipped'   => $skipped,
            'message'   => "Generated {$generated} draft payslip(s). {$skipped} skipped (already exist).",
        ]);
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
