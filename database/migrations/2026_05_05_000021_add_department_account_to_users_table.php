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
                ->constrained('departments', 'id', 'users_dept_fk')->nullOnDelete();
            $table->foreignId('account_id')->nullable()->after('department_id')
                ->constrained('accounts', 'id', 'users_acct_fk')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign('users_dept_fk');
            $table->dropForeign('users_acct_fk');
            $table->dropColumn(['department_id', 'account_id']);
        });
    }
};
