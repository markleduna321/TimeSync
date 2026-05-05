<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkReleasePayslipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['super_admin', 'admin']);
    }

    public function rules(): array
    {
        return [
            'payslip_ids'   => 'required|array|min:1',
            'payslip_ids.*' => 'integer|exists:payslips,id',
        ];
    }
}
