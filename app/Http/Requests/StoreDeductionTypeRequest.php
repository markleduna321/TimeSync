<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeductionTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check in controller
    }

    public function rules(): array
    {
        return [
            'name'         => 'required|string|max:191',
            'code'         => 'required|string|max:30|unique:deduction_types,code',
            'is_active'    => 'sometimes|boolean',
        ];
    }
}
