<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level policy gates this
    }

    public function rules(): array
    {
        return [
            'work_days'   => ['required', 'array', 'min:1'],
            'work_days.*' => ['string', 'in:Mon,Tue,Wed,Thu,Fri,Sat,Sun'],
            'shift_start' => ['required', 'date_format:H:i'],
            'shift_end'   => ['required', 'date_format:H:i', 'after:shift_start'],
        ];
    }
}
