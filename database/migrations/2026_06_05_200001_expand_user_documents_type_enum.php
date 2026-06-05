<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const NEW_TYPES = [
        'resume',
        'application_letter',
        'police_clearance',
        'nbi_clearance',
        'barangay_clearance',
        'sss',
        'pagibig',
        'philhealth',
        'tin',
        'birth_certificate',
        'diploma',
        'medical_certificate',
        'employment_contract',
        // legacy keys kept for backward compat
        'sss_id',
        'philhealth_id',
        'pagibig_id',
        'tin_id',
        'other',
    ];

    public function up(): void
    {
        $enumList = implode("','", self::NEW_TYPES);
        DB::statement("ALTER TABLE user_documents MODIFY COLUMN `type` ENUM('{$enumList}') NOT NULL DEFAULT 'other'");
    }

    public function down(): void
    {
        $oldTypes = ['resume','nbi_clearance','sss_id','philhealth_id','pagibig_id','tin_id','birth_certificate','other'];
        $enumList = implode("','", $oldTypes);
        DB::statement("ALTER TABLE user_documents MODIFY COLUMN `type` ENUM('{$enumList}') NOT NULL DEFAULT 'other'");
    }
};
