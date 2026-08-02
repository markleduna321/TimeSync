<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_overrides', function (Blueprint $table) {
            if (!Schema::hasColumn('schedule_overrides', 'swap_date')) {
                $table->date('swap_date')->nullable()->after('demotes_to_restday');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schedule_overrides', function (Blueprint $table) {
            if (Schema::hasColumn('schedule_overrides', 'swap_date')) {
                $table->dropColumn('swap_date');
            }
        });
    }
};
