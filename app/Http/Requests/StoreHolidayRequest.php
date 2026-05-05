<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHolidayRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $holidayId = $this->route('holiday')?->id;

        return [
            'date'        => 'required|date_format:Y-m-d|unique:holidays,date' . ($holidayId ? ",{$holidayId}" : ''),
            'name'        => 'required|string|max:191',
            'type'        => 'required|in:regular,special',
            'description' => 'nullable|string|max:500',
        ];
    }
}
