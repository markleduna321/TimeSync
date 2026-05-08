<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_user', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->foreign('role_id', 'ru_rid_fk')->references('id')->on('roles')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id', 'ru_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->primary(['role_id', 'user_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_user');
    }
};
