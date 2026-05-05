<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAllowanceTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // policy check in controller
    }

    public function rules(): array
    {
        $typeId = $this->route('type')?->id ?? $this->route('type');

        return [
            'name'                     => 'sometimes|string|max:191',
            'code'                     => "sometimes|string|max:30|unique:allowance_types,code,{$typeId}",
            'is_taxable'               => 'sometimes|boolean',
            'monthly_de_minimis_limit' => 'nullable|numeric|min:0',
            'description'              => 'nullable|string|max:500',
            'is_active'                => 'sometimes|boolean',
        ];
    }
}
