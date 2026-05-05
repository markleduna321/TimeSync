<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => 'sometimes|string|max:191',
            'description' => 'sometimes|nullable|string|max:500',
            'leader_id'   => 'sometimes|nullable|integer|exists:users,id',
            'manager_id'  => 'sometimes|nullable|integer|exists:users,id',
            'member_ids'  => 'sometimes|array',
            'member_ids.*'=> 'integer|exists:users,id',
        ];
    }
}
