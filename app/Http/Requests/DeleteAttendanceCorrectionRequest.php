<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeleteAttendanceCorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Policy handles authorization
    }

    public function rules(): array
    {
        return [
            'deleted_reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'deleted_reason.required' => 'A reason for removing this correction is required.',
            'deleted_reason.min'      => 'Please provide at least 5 characters for the reason.',
        ];
    }
}
