<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserExperienceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'         => ['required', 'in:work,education,certification,volunteer,other'],
            'title'        => ['required', 'string', 'max:200'],
            'organization' => ['required', 'string', 'max:200'],
            'location'     => ['nullable', 'string', 'max:200'],
            'start_date'   => ['required', 'date'],
            'end_date'     => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_current'   => ['boolean'],
            'description'  => ['nullable', 'string', 'max:2000'],
        ];
    }
}
