<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_break_configs', function (Blueprint $table) {
            $table->tinyInteger('break_count')->default(2)->change();
        });
    }

    public function down(): void
    {
        Schema::table('user_break_configs', function (Blueprint $table) {
            $table->tinyInteger('break_count')->default(1)->change();
        });
    }
};
