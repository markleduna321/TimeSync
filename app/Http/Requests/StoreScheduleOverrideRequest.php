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
        $promotesToWorkday = filter_var($this->input('promotes_to_workday', false), FILTER_VALIDATE_BOOLEAN);
        $demotesToRestday = filter_var($this->input('demotes_to_restday', false), FILTER_VALIDATE_BOOLEAN);
        $isDayStatusOverride = $promotesToWorkday || $demotesToRestday;

        return [
            'user_id'             => ['required', 'integer', 'exists:users,id'],
            'date'                => [
                'required',
                'date',
                $isDayStatusOverride ? 'date' : 'after_or_equal:today',
            ],
            'shift_start'         => [$isDayStatusOverride ? 'nullable' : 'required', 'date_format:H:i'],
            'shift_end'           => [$isDayStatusOverride ? 'nullable' : 'required', 'date_format:H:i', 'different:shift_start'],
            'promotes_to_workday' => ['boolean'],
            'demotes_to_restday'  => ['boolean'],
            'swap_date'           => ['nullable', 'date', 'different:date'],
            'note'                => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $promotesToWorkday = filter_var($this->input('promotes_to_workday', false), FILTER_VALIDATE_BOOLEAN);
            $demotesToRestday = filter_var($this->input('demotes_to_restday', false), FILTER_VALIDATE_BOOLEAN);
            $note = trim((string) $this->input('note', ''));
            $swapDate = trim((string) $this->input('swap_date', ''));

            if (($promotesToWorkday || $demotesToRestday) && $note === '') {
                $validator->errors()->add('note', 'A reason is required when changing the day status.');
            }

            if ($promotesToWorkday && $swapDate === '') {
                $validator->errors()->add('swap_date', 'Please select the rest day to swap with.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'date.after_or_equal'    => 'Shift overrides can only be set for today or future dates.',
            'shift_end.different'    => 'Shift end time must differ from shift start time.',
        ];
    }
}
