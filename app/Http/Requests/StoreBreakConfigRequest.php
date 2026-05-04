<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBreakConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level policy gates this
    }

    public function rules(): array
    {
        return [
            'break_allowed'          => ['required', 'boolean'],
            'break_count'            => ['required_if:break_allowed,true', 'integer', 'min:1', 'max:5'],
            'break_duration_minutes' => ['required_if:break_allowed,true', 'integer', 'min:5', 'max:60'],
            'lunch_duration_minutes' => ['required', 'integer', 'min:30', 'max:120'],
        ];
    }
}
