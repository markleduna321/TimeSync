<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_government_deduction_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'id', 'ugds_uid_fk')->cascadeOnDelete()->index();
            $table->string('code', 30); // SSS | PHILHEALTH | PAGIBIG | WITHHOLDING_TAX
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_government_deduction_settings');
    }
};
