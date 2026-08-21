<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->time('shift_start')->nullable()->change();
            $table->time('shift_end')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->time('shift_start')->nullable(false)->change();
            $table->time('shift_end')->nullable(false)->change();
        });
    }
};
