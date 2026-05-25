<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewLeaveApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Policy handles authorization in the controller
    }

    public function rules(): array
    {
        return [
            'action'     => 'required|in:approved,rejected',
            'admin_note' => 'nullable|string|max:1000',
        ];
    }
}
