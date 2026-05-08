<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overtime_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'ot_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->date('date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('total_minutes');
            $table->unsignedBigInteger('correction_id')->unique()->index();
            $table->foreign('correction_id', 'ot_corr_fk')->references('id')->on('attendance_corrections')->cascadeOnDelete();
            $table->unsignedBigInteger('approved_by')->index();
            $table->foreign('approved_by', 'ot_appr_fk')->references('id')->on('users');
            $table->timestamp('approved_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_records');
    }
};
