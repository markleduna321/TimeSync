<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            // 'first' = 1st–15th, no govt deductions
            // 'second' = 16th–EOM, includes SSS/PhilHealth/Pag-IBIG/WHT
            $table->enum('cutoff_type', ['first', 'second'])->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn('cutoff_type');
        });
    }
};
