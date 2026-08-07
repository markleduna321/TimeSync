<?php

namespace App\Http\Requests\External;

use Illuminate\Foundation\Http\FormRequest;

class ExternalPunchBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'punches'                  => ['required', 'array', 'min:1', 'max:500'],
            'punches.*.device_log_id'  => ['required', 'uuid'],
            'punches.*.user_id'        => ['required', 'integer', 'exists:users,id'],
            'punches.*.date'           => ['required', 'date_format:Y-m-d'],
            'punches.*.timestamp'      => ['required', 'date'],
            'punches.*.log_type'       => ['required', 'in:clock_in,break_out,break_in,clock_out'],
        ];
    }
}
