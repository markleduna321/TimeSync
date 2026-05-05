<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('department')?->id ?? $this->route('department');

        return [
            'name'        => 'sometimes|string|max:191',
            'code'        => "sometimes|string|max:30|unique:departments,code,{$id}",
            'description' => 'nullable|string|max:500',
            'is_active'   => 'sometimes|boolean',
        ];
    }
}
