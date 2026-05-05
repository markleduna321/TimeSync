<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHolidayRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $holidayId = $this->route('holiday')?->id;

        return [
            'date'        => "sometimes|date_format:Y-m-d|unique:holidays,date,{$holidayId}",
            'name'        => 'sometimes|string|max:191',
            'type'        => 'sometimes|in:regular,special',
            'description' => 'nullable|string|max:500',
        ];
    }
}
