<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewAttendanceCorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Policy handles auth
    }

    public function rules(): array
    {
        return [
            'action'               => ['required', 'in:approved,rejected'],
            'admin_note'           => ['nullable', 'string', 'max:500'],
            // Optional temporary shift override for corrections.
            // If both are provided, late/undertime will be evaluated against
            // these times instead of the employee's permanent schedule.
            'effective_shift_start' => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'effective_shift_end'   => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
        ];
    }
}
