<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payslips MODIFY COLUMN cutoff_type ENUM('first','second','13th_month') NULL");
    }

    public function down(): void
    {
        DB::statement("DELETE FROM payslips WHERE cutoff_type = '13th_month'");
        DB::statement("ALTER TABLE payslips MODIFY COLUMN cutoff_type ENUM('first','second') NULL");
    }
};
