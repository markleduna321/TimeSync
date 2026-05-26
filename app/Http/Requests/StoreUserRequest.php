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
            'password'       => 'nullable|string|min:8',
            'monthly_salary' => 'nullable|numeric|min:0',
            'roles'          => 'nullable|array',
            'roles.*'        => [
                'integer',
                'exists:roles,id',
                function ($attribute, $value, $fail) {
                    if ($this->user()?->hasRole('super_admin')) {
                        return; // super_admin can assign any role
                    }
                    $isSuperAdminRole = \App\Models\Role::where('id', $value)
                        ->where('slug', 'super_admin')
                        ->exists();
                    if ($isSuperAdminRole) {
                        $fail('You are not authorised to assign the super_admin role.');
                    }
                },
            ],
        ];
    }
}
