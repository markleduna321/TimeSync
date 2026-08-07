<?php

namespace App\Http\Requests\External;

use Illuminate\Foundation\Http\FormRequest;

class ExternalTimeLogBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'logs'                  => ['required', 'array', 'min:1', 'max:200'],
            'logs.*.device_log_id'  => ['nullable', 'uuid'],
            'logs.*.user_id'        => ['required', 'integer', 'exists:users,id'],
            'logs.*.date'           => ['required', 'date_format:Y-m-d'],
            'logs.*.clock_in'       => ['nullable', 'date'],
            'logs.*.clock_out'      => ['nullable', 'date'],
            'logs.*.lunch_start'    => ['nullable', 'date'],
            'logs.*.lunch_end'      => ['nullable', 'date'],
            'logs.*.breaks'         => ['nullable', 'array'],
            'logs.*.breaks.*.start' => ['nullable', 'date'],
            'logs.*.breaks.*.end'   => ['nullable', 'date'],
        ];
    }
}
