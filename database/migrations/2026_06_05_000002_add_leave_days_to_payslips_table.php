<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            // paid_leave_days  — approved paid-leave days consumed in this period
            // unpaid_leave_days — approved unpaid-leave days in this period
            // Both are decimal(5,2) to support half-day leaves (0.50).
            $table->decimal('paid_leave_days',   5, 2)->default(0)->after('days_absent');
            $table->decimal('unpaid_leave_days', 5, 2)->default(0)->after('paid_leave_days');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['paid_leave_days', 'unpaid_leave_days']);
        });
    }
};
