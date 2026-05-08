<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_user', function (Blueprint $table) {
            $table->unsignedBigInteger('team_id');
            $table->foreign('team_id', 'tu_tid_fk')->references('id')->on('teams')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id', 'tu_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->primary(['team_id', 'user_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_user');
    }
};
