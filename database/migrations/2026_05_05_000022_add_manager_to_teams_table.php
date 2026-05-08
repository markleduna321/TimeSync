<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('manager_id')->nullable()->after('leader_id')
                ->constrained('users', 'id', 'teams_manager_fk')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropForeign('teams_manager_fk');
            $table->dropColumn('manager_id');
        });
    }
};
