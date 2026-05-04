<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:191',
            'description' => 'nullable|string|max:500',
            'leader_id'   => 'nullable|integer|exists:users,id',
            'member_ids'  => 'nullable|array',
            'member_ids.*'=> 'integer|exists:users,id',
        ];
    }
}
