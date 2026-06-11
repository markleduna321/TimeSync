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
            
            // 1. Accept the new boolean flag
            'is_overnight' => ['sometimes', 'boolean'],
            
            // 2. Conditionally validate the end time
            'shift_end'    => [
                'required', 
                'date_format:H:i',
                function ($attribute, $value, $fail) {
                    $start = $this->input('shift_start');
                    // Ensure we handle boolean casting properly
                    $isOvernight = filter_var($this->input('is_overnight'), FILTER_VALIDATE_BOOLEAN);

                    // If it is NOT an overnight shift, the end time must be strictly after the start time.
                    if (!$isOvernight && $start >= $value) {
                        $fail('The shift end time must be after the start time.');
                    }
                }
            ],
        ];
    }
}