<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('monthly_salary')
                ->constrained()->nullOnDelete();
            $table->foreignId('account_id')->nullable()->after('department_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Department::class);
            $table->dropForeignIdFor(\App\Models\Account::class);
            $table->dropColumn(['department_id', 'account_id']);
        });
    }
};
