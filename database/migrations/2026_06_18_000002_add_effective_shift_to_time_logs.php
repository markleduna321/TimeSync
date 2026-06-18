<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('time_logs', function (Blueprint $table) {
            // Copied from the approved correction's effective shift, if set.
            // Used by payslip and attendance calendar to override the employee's
            // permanent schedule shift_start/shift_end for this specific day.
            $table->string('effective_shift_start', 5)->nullable()->after('overtime_minutes');
            $table->string('effective_shift_end',   5)->nullable()->after('effective_shift_start');
        });
    }

    public function down(): void
    {
        Schema::table('time_logs', function (Blueprint $table) {
            $table->dropColumn(['effective_shift_start', 'effective_shift_end']);
        });
    }
};
