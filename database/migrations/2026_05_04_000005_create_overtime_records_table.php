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
            $table->foreignId('user_id')->constrained('users', 'id', 'ot_uid_fk')->cascadeOnDelete()->index();
            $table->date('date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('total_minutes');
            $table->foreignId('correction_id')->unique()->constrained('attendance_corrections', 'id', 'ot_corr_fk')->cascadeOnDelete();
            $table->foreignId('approved_by')->constrained('users', 'id', 'ot_appr_fk');
            $table->timestamp('approved_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_records');
    }
};
