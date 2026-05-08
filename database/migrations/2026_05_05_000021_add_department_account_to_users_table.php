<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('department_id')->nullable()->after('monthly_salary')->index();
            $table->foreign('department_id', 'users_dept_fk')->references('id')->on('departments')->nullOnDelete();
            $table->unsignedBigInteger('account_id')->nullable()->after('department_id')->index();
            $table->foreign('account_id', 'users_acct_fk')->references('id')->on('accounts')->nullOnDelete();
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
