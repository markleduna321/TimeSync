<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->string('requested_lunch_start', 5)->nullable()->after('requested_clock_out');
            $table->string('requested_lunch_end', 5)->nullable()->after('requested_lunch_start');
            $table->json('requested_breaks')->nullable()->after('requested_lunch_end');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->dropColumn(['requested_lunch_start', 'requested_lunch_end', 'requested_breaks']);
        });
    }
};
