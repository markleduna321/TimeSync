<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_credit_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leave_type_id')
                  ->unique()
                  ->constrained('leave_types')
                  ->cascadeOnDelete();
            $table->enum('allocation_type', ['monthly_accrual', 'annual_lump', 'manual'])
                  ->default('annual_lump');
            $table->decimal('monthly_rate', 5, 2)->nullable();   // e.g. 0.50
            $table->decimal('annual_amount', 5, 2)->nullable();   // e.g. 6.00
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_credit_policies');
    }
};
