<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_user', function (Blueprint $table) {
            $table->foreignId('team_id')->constrained('teams', 'id', 'tu_tid_fk')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users', 'id', 'tu_uid_fk')->cascadeOnDelete();
            $table->primary(['team_id', 'user_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_user');
    }
};
