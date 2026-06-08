<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkDraftPayslipRequest extends FormRequest
{
    public function authorize(): bool { return true; } // Policy enforced in controller

    public function rules(): array
    {
        return [
            'period_start' => ['required', 'date_format:Y-m-d'],
            'period_end'   => ['required', 'date_format:Y-m-d', 'after_or_equal:period_start'],
            'pay_date'     => ['nullable', 'date_format:Y-m-d'],
            'method'       => ['nullable', 'in:days_worked,flat_rate'],
        ];
    }

    public function messages(): array
    {
        return [
            'period_start.required' => 'Period start date is required.',
            'period_end.required'   => 'Period end date is required.',
            'period_end.after_or_equal' => 'Period end must be on or after the start date.',
        ];
    }
}
