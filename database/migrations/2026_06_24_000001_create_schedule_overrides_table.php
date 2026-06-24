<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_overrides', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->date('date');

            // Overridden shift window (HH:MM:SS as stored by MySQL TIME columns)
            $table->time('shift_start');
            $table->time('shift_end');

            // When true this rest day is treated as a regular work day for payroll.
            // Ignored if the day is already a scheduled work day.
            $table->boolean('promotes_to_workday')->default(false);

            $table->string('note', 255)->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // One override per employee per date
            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_overrides');
    }
};
