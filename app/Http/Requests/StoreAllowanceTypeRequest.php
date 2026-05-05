<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAllowanceTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check in controller
    }

    public function rules(): array
    {
        return [
            'name'                     => 'required|string|max:191',
            'code'                     => 'required|string|max:30|unique:allowance_types,code',
            'is_taxable'               => 'required|boolean',
            'monthly_de_minimis_limit' => 'nullable|numeric|min:0',
            'description'              => 'nullable|string|max:500',
        ];
    }
}
