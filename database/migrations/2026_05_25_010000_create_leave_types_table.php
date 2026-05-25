<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 10)->unique();      // VL, SL, EL, etc.
            $table->string('color', 7)->default('#6366f1'); // hex for calendar
            $table->unsignedTinyInteger('min_advance_days')->default(0);  // VL=7, SL=0
            $table->unsignedTinyInteger('max_consecutive_days')->nullable(); // optional cap
            $table->unsignedTinyInteger('requires_proof_above_days')->nullable(); // e.g. SL proof if >2 days
            $table->boolean('is_paid')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_types');
    }
};
