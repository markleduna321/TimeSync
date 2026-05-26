<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_monetizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();
            $table->foreignId('leave_type_id')
                  ->constrained('leave_types')
                  ->cascadeOnDelete();
            $table->smallInteger('year')->unsigned();
            $table->decimal('eligible_days', 6, 2);
            $table->decimal('daily_rate_used', 10, 2);
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['pending', 'processed'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'leave_type_id', 'year'], 'leave_monetizations_unique');
            $table->index('user_id');
            $table->index(['year', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_monetizations');
    }
};
