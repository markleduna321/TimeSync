<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertLeaveCreditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['super_admin', 'admin']);
    }

    public function rules(): array
    {
        return [
            'leave_type_id' => 'required|exists:leave_types,id',
            'year'          => 'required|integer|min:2000|max:2100',
            'action'        => 'required|in:set,add',   // set = overwrite total, add = increment
            'amount'        => 'required|numeric|min:0|max:366',
            'note'          => 'nullable|string|max:500',
        ];
    }
}
