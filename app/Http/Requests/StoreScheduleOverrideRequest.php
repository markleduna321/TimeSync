<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleOverrideRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled in the controller via Policy.
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id'             => ['required', 'integer', 'exists:users,id'],
            'date'                => ['required', 'date', 'after_or_equal:today'],
            'shift_start'         => ['required', 'date_format:H:i'],
            'shift_end'           => ['required', 'date_format:H:i', 'different:shift_start'],
            'promotes_to_workday' => ['boolean'],
            'note'                => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.after_or_equal'    => 'Shift overrides can only be set for today or future dates.',
            'shift_end.different'    => 'Shift end time must differ from shift start time.',
        ];
    }
}
