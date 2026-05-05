<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:191',
            'code'        => 'required|string|max:30|unique:departments,code',
            'description' => 'nullable|string|max:500',
        ];
    }
}
