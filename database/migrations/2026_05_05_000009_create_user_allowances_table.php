<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_allowances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'ua_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->unsignedBigInteger('allowance_type_id')->index();
            $table->foreign('allowance_type_id', 'ua_atid_fk')->references('id')->on('allowance_types')->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->comment('Monthly amount; service halves per cutoff');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_allowances');
    }
};
