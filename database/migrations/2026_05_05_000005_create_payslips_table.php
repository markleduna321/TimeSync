<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'ps_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->date('pay_date')->nullable();
            $table->decimal('monthly_salary', 12, 2);      // snapshot at generation time
            $table->decimal('daily_rate', 12, 2);          // snapshot
            $table->decimal('basic_pay', 12, 2);
            $table->decimal('gross_pay', 12, 2);
            $table->decimal('total_deductions', 12, 2);
            $table->decimal('net_pay', 12, 2);
            $table->unsignedSmallInteger('days_scheduled')->default(0);
            $table->unsignedSmallInteger('days_worked')->default(0);
            $table->unsignedSmallInteger('days_absent')->default(0);
            $table->unsignedInteger('late_minutes')->default(0);
            $table->unsignedInteger('undertime_minutes')->default(0);
            $table->enum('status', ['draft', 'released'])->default('draft');
            $table->unsignedBigInteger('generated_by')->index();
            $table->foreign('generated_by', 'ps_genby_fk')->references('id')->on('users')->restrictOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'period_start', 'period_end'], 'payslips_user_period_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
