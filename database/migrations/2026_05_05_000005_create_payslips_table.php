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
            $table->foreignId('user_id')->constrained('users', 'id', 'ps_uid_fk')->cascadeOnDelete()->index();
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
            $table->foreignId('generated_by')->constrained('users', 'id', 'ps_genby_fk')->restrictOnDelete();
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
