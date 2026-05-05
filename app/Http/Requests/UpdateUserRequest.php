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
            'first_name'     => 'sometimes|string|max:191',
            'middle_name'    => 'sometimes|nullable|string|max:191',
            'last_name'      => 'sometimes|string|max:191',
            'email'          => "sometimes|email|max:191|unique:users,email,{$userId}",
            'password'       => 'sometimes|nullable|string|min:8',
            'monthly_salary' => 'sometimes|nullable|numeric|min:0',
            'roles'          => 'sometimes|array',
            'roles.*'        => 'integer|exists:roles,id',
            'department_id'  => 'nullable|integer|exists:departments,id',
            'account_id'     => 'nullable|integer|exists:accounts,id',
        ];
    }
}
