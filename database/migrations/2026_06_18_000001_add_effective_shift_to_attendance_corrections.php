<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            // Optional override shift times set by admin when approving a correction.
            // Stored as HH:MM strings (e.g. "15:00", "00:00").
            $table->string('effective_shift_start', 5)->nullable()->after('requested_clock_out');
            $table->string('effective_shift_end',   5)->nullable()->after('effective_shift_start');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->dropColumn(['effective_shift_start', 'effective_shift_end']);
        });
    }
};
