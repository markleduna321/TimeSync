<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            // Number of holiday dates (regular + special) that fell on scheduled
            // work days and the employee did NOT work.
            $table->unsignedSmallInteger('holiday_days')->default(0)->after('days_absent');

            // Of those, how many the employee actually reported for duty
            // (triggers holiday premium pay).
            $table->unsignedSmallInteger('holiday_days_worked')->default(0)->after('holiday_days');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['holiday_days', 'holiday_days_worked']);
        });
    }
};
