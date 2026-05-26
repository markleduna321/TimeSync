<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->decimal('days_worked', 5, 2)->default(0)->change();
            $table->decimal('days_absent', 5, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->unsignedSmallInteger('days_worked')->default(0)->change();
            $table->unsignedSmallInteger('days_absent')->default(0)->change();
        });
    }
};
