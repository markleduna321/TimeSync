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
            'work_days'    => ['required', 'array', 'min:1'],
            'work_days.*'  => ['string', 'in:Mon,Tue,Wed,Thu,Fri,Sat,Sun'],
            'shift_start'  => ['required', 'date_format:H:i'],
            'time_by_day'  => ['nullable', 'array'],
            'time_by_day.*' => ['nullable', 'array'],
            'time_by_day.*.shift_start' => ['nullable', 'date_format:H:i'],
            'time_by_day.*.shift_end' => ['nullable', 'date_format:H:i'],
            'is_overnight' => ['sometimes', 'boolean'],
            'shift_end'    => [
                'required', 
                'date_format:H:i',
                function ($attribute, $value, $fail) {
                    $start = $this->input('shift_start');
                    $isOvernight = filter_var($this->input('is_overnight'), FILTER_VALIDATE_BOOLEAN);

                    if (!$isOvernight && $start >= $value) {
                        $fail('The shift end time must be after the start time.');
                    }
                }
            ],
        ];
    }
}