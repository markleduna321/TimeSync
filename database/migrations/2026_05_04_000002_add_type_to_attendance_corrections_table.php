<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->enum('type', ['correction', 'overtime'])
                  ->default('correction')
                  ->after('status')
                  ->index();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_corrections', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
