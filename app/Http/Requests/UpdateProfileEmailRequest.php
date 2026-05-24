<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileEmailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'            => ['required', 'email', 'max:191', Rule::unique('users')->ignore($this->user()->id)],
            'current_password' => ['required', 'current_password'],
        ];
    }
}
