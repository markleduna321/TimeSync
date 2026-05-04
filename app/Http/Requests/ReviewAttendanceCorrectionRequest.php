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
            'action'     => ['required', 'in:approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
