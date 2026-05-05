<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePayslipRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'user_id'               => 'required|integer|exists:users,id',
            'period_start'          => 'required|date_format:Y-m-d',
            'period_end'            => 'required|date_format:Y-m-d|after_or_equal:period_start',
            'pay_date'              => 'nullable|date_format:Y-m-d',
            'incentive_amount'      => 'nullable|numeric|min:0',
            'incentive_description' => 'nullable|string|max:255',
            'prior_period_amount'   => 'nullable|numeric|min:0',
            'prior_period_start'    => 'nullable|date_format:Y-m-d',
            'prior_period_end'      => 'nullable|date_format:Y-m-d|after_or_equal:prior_period_start',
        ];
    }
}
