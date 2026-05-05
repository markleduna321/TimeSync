<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('account')?->id ?? $this->route('account');

        return [
            'name'        => 'sometimes|string|max:191',
            'code'        => "sometimes|string|max:30|unique:accounts,code,{$id}",
            'description' => 'nullable|string|max:500',
            'is_active'   => 'sometimes|boolean',
        ];
    }
}
