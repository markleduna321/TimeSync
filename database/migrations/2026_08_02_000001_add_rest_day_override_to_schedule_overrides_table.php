<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_overrides', function (Blueprint $table) {
            $table->boolean('demotes_to_restday')->default(false)->after('promotes_to_workday');
            $table->time('shift_start')->nullable()->change();
            $table->time('shift_end')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('schedule_overrides', function (Blueprint $table) {
            $table->dropColumn('demotes_to_restday');
        });
    }
};
