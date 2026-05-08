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
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'ud_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->unsignedBigInteger('deduction_type_id')->index();
            $table->foreign('deduction_type_id', 'ud_dtid_fk')->references('id')->on('deduction_types')->cascadeOnDelete();
            $table->string('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('effective_from');
            $table->date('effective_until')->nullable();
            $table->unsignedBigInteger('added_by')->index();
            $table->foreign('added_by', 'ud_addedby_fk')->references('id')->on('users')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_deductions');
    }
};
