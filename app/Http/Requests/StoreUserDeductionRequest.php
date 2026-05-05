<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserDeductionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'deduction_type_id' => 'required|integer|exists:deduction_types,id',
            'description'       => 'nullable|string|max:255',
            'amount'            => 'required|numeric|min:0',
            'effective_from'    => 'required|date_format:Y-m-d',
            'effective_until'   => 'nullable|date_format:Y-m-d|after:effective_from',
        ];
    }
}
