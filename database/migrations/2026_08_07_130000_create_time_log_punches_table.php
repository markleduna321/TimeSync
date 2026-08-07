<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_log_punches', function (Blueprint $table) {
            $table->id();
            // One row per punch event from the desktop; device_log_id is the idempotency key
            $table->char('device_log_id', 36)->unique();
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->date('date')->index();
            $table->dateTime('punched_at');
            $table->enum('log_type', ['clock_in', 'break_out', 'break_in', 'clock_out']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_log_punches');
    }
};
