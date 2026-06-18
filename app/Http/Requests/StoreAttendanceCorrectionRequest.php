<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttendanceCorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Policy handles auth
    }

    public function rules(): array
    {
        $isOvertime = $this->input('type') === 'overtime';

        return [
            'date'                 => ['required', 'date', 'before_or_equal:today'],
            'type'                 => ['nullable', 'in:correction,overtime'],
            'reason'               => ['required', 'string', 'min:10', 'max:1000'],
            'proof'                => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'is_overnight'         => ['sometimes', 'boolean'],
            'requested_clock_in'   => [
                Rule::requiredIf($isOvertime),
                'nullable',
                'date_format:H:i',
            ],
            'requested_clock_out'  => [
                Rule::requiredIf($isOvertime),
                'nullable',
                'date_format:H:i',
                function ($attribute, $value, $fail) {
                    $start       = $this->input('requested_clock_in');
                    $isOvernight = filter_var($this->input('is_overnight'), FILTER_VALIDATE_BOOLEAN);

                    // Only enforce end > start when both times are present and it is NOT overnight
                    if (!$isOvernight && $start && $value && $value <= $start) {
                        $fail('End time must be after start time. Enable overnight if the shift crosses midnight.');
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'proof.mimes'                  => 'Accepted formats: JPG, PNG, PDF.',
            'proof.max'                    => 'Proof file must not exceed 5 MB.',
            'reason.min'                   => 'Please provide at least 10 characters explaining the reason.',
            'requested_clock_in.required'  => 'Overtime start time is required.',
            'requested_clock_out.required' => 'Overtime end time is required.',
        ];
    }
}
