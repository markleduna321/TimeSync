<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', [
                'resume',
                'nbi_clearance',
                'sss_id',
                'philhealth_id',
                'pagibig_id',
                'tin_id',
                'birth_certificate',
                'other',
            ])->default('other');
            $table->string('name');              // Display name shown to user
            $table->string('file_path', 500);    // Storage disk path — never exposed directly
            $table->unsignedBigInteger('file_size'); // bytes
            $table->string('mime_type', 100);
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_documents');
    }
};
