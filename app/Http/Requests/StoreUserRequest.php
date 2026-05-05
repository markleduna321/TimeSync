<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check done in controller
    }

    public function rules(): array
    {
        return [
            'first_name'     => 'required|string|max:191',
            'middle_name'    => 'nullable|string|max:191',
            'last_name'      => 'required|string|max:191',
            'email'          => 'required|email|max:191|unique:users,email',
            'password'       => 'required|string|min:8',
            'roles'          => 'nullable|array',
            'roles.*'        => 'integer|exists:roles,id',
        ];
    }
}
