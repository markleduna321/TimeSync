<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserAllowanceRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'allowance_type_id' => 'required|integer|exists:allowance_types,id',
            'amount'            => 'required|numeric|min:0',
            'effective_from'    => 'required|date_format:Y-m-d',
            'effective_to'      => 'nullable|date_format:Y-m-d|after_or_equal:effective_from',
            'is_active'         => 'boolean',
            'description'       => 'nullable|string|max:255',
        ];
    }
}
