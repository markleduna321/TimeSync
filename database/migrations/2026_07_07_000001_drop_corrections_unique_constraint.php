<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drop the database-level unique constraint on (user_id, date, type) so that
 * soft-deleted correction rows no longer block an employee from re-filing.
 * Uniqueness is now enforced at the application layer in
 * StoreAttendanceCorrectionRequest using whereNull('deleted_at').
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->dropUnique('corrections_user_date_type_unique');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->unique(['user_id', 'date', 'type'], 'corrections_user_date_type_unique');
        });
    }
};
