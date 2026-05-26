<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RunLeaveMonetizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['super_admin', 'admin']);
    }

    public function rules(): array
    {
        return [
            'year'  => 'required|integer|min:2020|max:' . now()->year,
            'force' => 'boolean',
        ];
    }
}
