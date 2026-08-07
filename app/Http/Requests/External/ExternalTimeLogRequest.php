<?php

namespace App\Http\Requests\External;

use Illuminate\Foundation\Http\FormRequest;

class ExternalTimeLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'device_log_id' => ['nullable', 'uuid'],
            'user_id'       => ['required', 'integer', 'exists:users,id'],
            'date'          => ['required', 'date_format:Y-m-d'],
            'clock_in'      => ['nullable', 'date'],
            'clock_out'     => ['nullable', 'date', 'after_or_equal:clock_in'],
            'lunch_start'   => ['nullable', 'date'],
            'lunch_end'     => ['nullable', 'date', 'after_or_equal:lunch_start'],
            'breaks'        => ['nullable', 'array'],
            'breaks.*.start'=> ['required_with:breaks.*.end', 'date'],
            'breaks.*.end'  => ['nullable', 'date'],
        ];
    }
}
