<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();
            $table->foreignId('leave_type_id')
                  ->constrained('leave_types')
                  ->cascadeOnDelete();
            $table->smallInteger('year')->unsigned();
            $table->decimal('total_credits', 6, 2)->default(0);
            $table->decimal('used_credits',  6, 2)->default(0);
            $table->decimal('carried_over',  6, 2)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'leave_type_id', 'year']);
            $table->index('user_id');
            $table->index(['leave_type_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_credits');
    }
};
