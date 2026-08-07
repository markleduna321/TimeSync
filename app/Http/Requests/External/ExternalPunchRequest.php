<?php

namespace App\Http\Requests\External;

use Illuminate\Foundation\Http\FormRequest;

class ExternalPunchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'device_log_id' => ['required', 'uuid'],
            'user_id'       => ['required', 'integer', 'exists:users,id'],
            'date'          => ['required', 'date_format:Y-m-d'],
            'timestamp'     => ['required', 'date'],
            'log_type'      => ['required', 'in:clock_in,break_out,break_in,clock_out'],
        ];
    }
}
