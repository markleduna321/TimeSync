<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserExperienceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'         => ['sometimes', 'in:work,education,certification,volunteer,other'],
            'title'        => ['sometimes', 'string', 'max:200'],
            'organization' => ['sometimes', 'string', 'max:200'],
            'location'     => ['nullable', 'string', 'max:200'],
            'start_date'   => ['sometimes', 'date'],
            'end_date'     => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_current'   => ['boolean'],
            'description'  => ['nullable', 'string', 'max:2000'],
        ];
    }
}
