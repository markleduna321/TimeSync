<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            // One correction + one overtime per user per date
            $table->unique(['user_id', 'date', 'type'], 'corrections_user_date_type_unique');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->dropUnique('corrections_user_date_type_unique');
        });
    }
};
