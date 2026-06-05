<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayslipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'user'              => $this->whenLoaded('user', fn () => [
                'id'   => $this->user->id,
                'name' => $this->user->name,
            ]),
            'period_start'      => $this->period_start?->toDateString(),
            'period_end'        => $this->period_end?->toDateString(),
            'pay_date'          => $this->pay_date?->toDateString(),
            'monthly_salary'    => $this->monthly_salary,
            'daily_rate'        => $this->daily_rate,
            'basic_pay'         => $this->basic_pay,
            'gross_pay'         => $this->gross_pay,
            'total_deductions'  => $this->total_deductions,
            'net_pay'           => $this->net_pay,
            'days_scheduled'    => $this->days_scheduled,
            'days_worked'       => $this->days_worked,
            'days_absent'       => $this->days_absent,
            'paid_leave_days'   => $this->paid_leave_days,
            'unpaid_leave_days' => $this->unpaid_leave_days,
            'holiday_days'        => $this->holiday_days,
            'holiday_days_worked' => $this->holiday_days_worked,
            'late_minutes'        => $this->late_minutes,
            'undertime_minutes'   => $this->undertime_minutes,
            'over_break_minutes'  => $this->over_break_minutes,
            'ot_minutes'          => $this->ot_minutes,
            'rest_day_minutes'    => $this->rest_day_minutes,
            'rest_day_ot_minutes' => $this->rest_day_ot_minutes,
            'status'            => $this->status,
            'cutoff_type'       => $this->cutoff_type,
            'taxable_income'    => $this->taxable_income,
            'generated_by'      => $this->whenLoaded('generatedBy', fn () => $this->generatedBy?->name),
            'released_at'       => $this->released_at?->toISOString(),
            'created_at'        => $this->created_at?->toISOString(),
            'lines'             => $this->whenLoaded('lines', fn () =>
                $this->lines->map(fn ($l) => [
                    'id'          => $l->id,
                    'category'    => $l->category,
                    'sort_order'  => $l->sort_order,
                    'code'        => $l->code,
                    'description' => $l->description,
                    'amount'      => $l->amount,
                    'is_taxable'  => $l->is_taxable,
                ])->values()
            ),
            'monthly_breakdown' => $this->when(
                $this->cutoff_type === '13th_month',
                function () {
                    $year = (int) $this->period_start?->format('Y');
                    $rows = \App\Models\Payslip::select('period_start', 'basic_pay')
                        ->where('user_id', $this->user_id)
                        ->where('status', 'released')
                        ->whereYear('period_start', $year)
                        ->whereIn('cutoff_type', ['first', 'second'])
                        ->orderBy('period_start')
                        ->get();

                    $byMonth = [];
                    foreach ($rows as $ps) {
                        $num  = (int) $ps->period_start->format('n');
                        $name = $ps->period_start->format('F');
                        if (!isset($byMonth[$num])) {
                            $byMonth[$num] = ['month' => $name, 'basic_pay' => 0.0];
                        }
                        $byMonth[$num]['basic_pay'] = round($byMonth[$num]['basic_pay'] + (float) $ps->basic_pay, 2);
                    }

                    ksort($byMonth);
                    return array_values($byMonth);
                }
            ),
        ];
    }
}
