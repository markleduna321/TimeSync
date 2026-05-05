<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDeductionTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check in controller
    }

    public function rules(): array
    {
        $typeId = $this->route('type')?->id ?? $this->route('type');

        return [
            'name'      => 'sometimes|string|max:191',
            'code'      => "sometimes|string|max:30|unique:deduction_types,code,{$typeId}",
            'is_active' => 'sometimes|boolean',
        ];
    }
}
