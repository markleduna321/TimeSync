<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_break_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'id', 'ubc_uid_fk')->cascadeOnDelete()->unique();
            $table->boolean('break_allowed')->default(false);
            $table->tinyInteger('break_count')->default(1);           // max breaks per day
            $table->tinyInteger('break_duration_minutes')->default(15);
            $table->tinyInteger('lunch_duration_minutes')->default(60);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_break_configs');
    }
};
