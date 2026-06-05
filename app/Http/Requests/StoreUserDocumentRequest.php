<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:10240', // 10 MB
                'mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx',
            ],
            'type' => [
                'required',
                'in:resume,nbi_clearance,police_clearance,barangay_clearance,application_letter,sss,pagibig,philhealth,tin,birth_certificate,diploma,medical_certificate,employment_contract,other',
            ],
            'name' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimes' => 'Only PDF, images (JPG/PNG/GIF/WebP), and Office documents (DOC/DOCX/XLS/XLSX) are allowed.',
            'file.max'   => 'File size must not exceed 10 MB.',
        ];
    }
}
