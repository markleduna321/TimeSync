<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_entries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete()
                ->index();

            $table->date('date')->index();

            // Compensated hours at hourly rate (daily_rate / 8)
            $table->decimal('hours', 4, 2);

            $table->string('description', 255);

            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->foreign('created_by', 'training_entries_created_by_foreign')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->timestamps();

            // One training entry per employee per date
            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_entries');
    }
};
