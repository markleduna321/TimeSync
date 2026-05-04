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
        Schema::create('time_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->index();
            $table->date('date')->index();
            $table->dateTime('clock_in')->nullable();
            $table->dateTime('clock_out')->nullable();
            $table->dateTime('lunch_start')->nullable();
            $table->dateTime('lunch_end')->nullable();
            $table->json('breaks')->nullable();    // [{"start":"...","end":"..."}]
            $table->enum('status', ['active', 'on_lunch', 'on_break', 'clocked_out'])
                  ->default('active');
            $table->timestamps();

            $table->unique(['user_id', 'date']);   // one log per user per day
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_logs');
    }
};
