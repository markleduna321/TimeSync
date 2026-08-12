<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Backfills the `time_by_day` column that was added to the original
     * create_schedules_table migration's up() after it had already run in
     * production — Laravel never re-executes an applied migration, so the
     * column was missing from the live schema despite existing in code.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->json('time_by_day')->nullable()->after('shift_end');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn('time_by_day');
        });
    }
};
