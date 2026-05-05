<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->unsignedInteger('ot_minutes')->default(0)->after('undertime_minutes');
            $table->unsignedInteger('rest_day_minutes')->default(0)->after('ot_minutes');
            $table->unsignedInteger('rest_day_ot_minutes')->default(0)->after('rest_day_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['ot_minutes', 'rest_day_minutes', 'rest_day_ot_minutes']);
        });
    }
};
