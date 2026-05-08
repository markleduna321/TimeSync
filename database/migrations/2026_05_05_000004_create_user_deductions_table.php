<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'id', 'ud_uid_fk')->cascadeOnDelete();
            $table->foreignId('deduction_type_id')->constrained('deduction_types', 'id', 'ud_dtid_fk')->cascadeOnDelete();
            $table->string('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('effective_from');
            $table->date('effective_until')->nullable();
            $table->foreignId('added_by')->constrained('users', 'id', 'ud_addedby_fk')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_deductions');
    }
};
