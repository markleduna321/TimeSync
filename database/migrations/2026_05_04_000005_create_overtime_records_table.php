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
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->index();
            $table->date('date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('total_minutes');
            $table->foreignId('correction_id')->unique()->constrained('attendance_corrections')->cascadeOnDelete();
            $table->foreignId('approved_by')->constrained('users');
            $table->timestamp('approved_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_records');
    }
};
