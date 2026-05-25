<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();
            $table->foreignId('leave_type_id')
                  ->constrained('leave_types')
                  ->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days_requested', 4, 2);   // stored on creation for immutability
            $table->boolean('half_day')->default(false);
            $table->enum('half_day_period', ['AM', 'PM'])->nullable();
            $table->text('reason')->nullable();
            $table->string('proof_path')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])
                  ->default('pending');
            $table->foreignId('reviewed_by')->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('start_date');
            $table->index('leave_type_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_applications');
    }
};
