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
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'tlh_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->date('date')->index();
            $table->unsignedBigInteger('time_log_id')->nullable()->index();
            $table->foreign('time_log_id', 'tlh_tlog_fk')->references('id')->on('time_logs')->nullOnDelete();
            $table->datetime('old_clock_in')->nullable();
            $table->datetime('old_clock_out')->nullable();
            $table->datetime('new_clock_in')->nullable();
            $table->datetime('new_clock_out')->nullable();
            $table->unsignedBigInteger('correction_id')->index();
            $table->foreign('correction_id', 'tlh_corr_fk')->references('id')->on('attendance_corrections')->cascadeOnDelete();
            $table->unsignedBigInteger('changed_by')->index();
            $table->foreign('changed_by', 'tlh_chgby_fk')->references('id')->on('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_log_histories');
    }
};
