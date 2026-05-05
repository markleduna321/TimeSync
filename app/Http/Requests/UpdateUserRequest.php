<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check done in controller
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name'           => 'sometimes|string|max:191',
            'email'          => "sometimes|email|max:191|unique:users,email,{$userId}",
            'password'       => 'sometimes|nullable|string|min:8',
            'monthly_salary' => 'sometimes|nullable|numeric|min:0',
            'roles'          => 'sometimes|array',
            'roles.*'        => 'integer|exists:roles,id',
        ];
    }
}
