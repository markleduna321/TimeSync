<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeaveTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['super_admin', 'admin']);
    }

    public function rules(): array
    {
        $typeId = $this->route('type')?->id;

        return [
            'name'                      => 'required|string|max:100',
            'code'                      => 'required|string|max:10|unique:leave_types,code,' . $typeId,
            'color'                     => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'min_advance_days'          => 'required|integer|min:0|max:365',
            'max_consecutive_days'      => 'nullable|integer|min:1',
            'requires_proof_above_days' => 'nullable|integer|min:1',
            'is_paid'                   => 'required|boolean',
            'is_active'                 => 'required|boolean',
            // Credit policy (optional, upserted together)
            'policy.allocation_type'    => 'nullable|in:monthly_accrual,annual_lump,manual',
            'policy.monthly_rate'       => 'nullable|numeric|min:0|max:31',
            'policy.annual_amount'      => 'nullable|numeric|min:0|max:366',
            'policy.is_active'          => 'nullable|boolean',
        ];
    }
}
