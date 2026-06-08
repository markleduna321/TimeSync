<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add a `method` ENUM to record which computation was used:
        //   - days_worked: basic = days_worked × daily_rate (current DOLE method)
        //   - flat_rate  : basic = (monthly_salary / 2) − (days_absent × daily_rate)
        DB::statement("ALTER TABLE payslips ADD COLUMN method ENUM('days_worked','flat_rate') NOT NULL DEFAULT 'days_worked' AFTER cutoff_type");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payslips DROP COLUMN method");
    }
};
