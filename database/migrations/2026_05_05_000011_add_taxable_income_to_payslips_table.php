<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->decimal('taxable_income', 12, 2)->nullable()
                  ->after('net_pay')
                  ->comment('Semi-monthly taxable income; used by 2nd cutoff for cumulative WHT');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn('taxable_income');
        });
    }
};
