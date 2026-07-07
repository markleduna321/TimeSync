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
            // Both must be supplied together or not at all (required_with enforces pairing).
            'effective_shift_start' => ['nullable', 'date_format:H:i', 'required_with:effective_shift_end'],
            'effective_shift_end'   => ['nullable', 'date_format:H:i', 'required_with:effective_shift_start'],
        ];
    }
}
