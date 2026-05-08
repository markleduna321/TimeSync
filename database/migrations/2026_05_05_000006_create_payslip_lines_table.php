<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payslip_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payslip_id')->index();
            $table->foreign('payslip_id', 'psl_psid_fk')->references('id')->on('payslips')->cascadeOnDelete();
            $table->enum('category', ['earning', 'deduction']);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('code', 30);
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslip_lines');
    }
};
