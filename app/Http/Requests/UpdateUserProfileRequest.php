<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Controller enforces own-record via policy
    }

    public function rules(): array
    {
        return [
            // Basic personal info
            'suffix'         => ['nullable', 'string', 'max:10'],
            'date_of_birth'  => ['nullable', 'date', 'before_or_equal:today', 'after:1900-01-01'],
            'gender'         => ['nullable', 'in:male,female,other,prefer_not_to_say'],
            'nationality'    => ['nullable', 'string', 'max:100'],
            'marital_status' => ['nullable', 'in:single,married,widowed,separated,divorced'],

            // Contact
            'phone_number'   => ['nullable', 'string', 'max:30'],

            // Address
            'street_address' => ['nullable', 'string', 'max:255'],
            'barangay'       => ['nullable', 'string', 'max:100'],
            'city'           => ['nullable', 'string', 'max:100'],
            'province'       => ['nullable', 'string', 'max:100'],
            'zip_code'       => ['nullable', 'string', 'max:20'],
            'country'        => ['nullable', 'string', 'max:100'],

            // Emergency contact
            'emergency_contact_name'         => ['nullable', 'string', 'max:150'],
            'emergency_contact_number'       => ['nullable', 'string', 'max:30'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:80'],

            // Government IDs
            'sss_number'       => ['nullable', 'string', 'max:30'],
            'pagibig_number'   => ['nullable', 'string', 'max:30'],
            'philhealth_number'=> ['nullable', 'string', 'max:30'],
            'tin_number'       => ['nullable', 'string', 'max:30'],
        ];
    }
}
