<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClockActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum middleware handles authentication
    }

    public function rules(): array
    {
        return []; // no body params — action is implied by the endpoint
    }
}
