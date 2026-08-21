<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_pay_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'ups_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->string('code', 50);
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'code'], 'ups_user_code_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_pay_settings');
    }
};
