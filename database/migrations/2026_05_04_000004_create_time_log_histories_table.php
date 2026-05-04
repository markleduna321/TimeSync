<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_log_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->index();
            $table->date('date')->index();
            $table->foreignId('time_log_id')->nullable()->constrained('time_logs')->nullOnDelete();
            $table->datetime('old_clock_in')->nullable();
            $table->datetime('old_clock_out')->nullable();
            $table->datetime('new_clock_in')->nullable();
            $table->datetime('new_clock_out')->nullable();
            $table->foreignId('correction_id')->constrained('attendance_corrections')->cascadeOnDelete();
            $table->foreignId('changed_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_log_histories');
    }
};
