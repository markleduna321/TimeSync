<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();

            // Basic personal info
            $table->string('suffix', 10)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable();
            $table->string('nationality', 100)->nullable()->default('Filipino');
            $table->enum('marital_status', ['single', 'married', 'widowed', 'separated', 'divorced'])->nullable();

            // Contact
            $table->string('phone_number', 30)->nullable();

            // Address
            $table->string('street_address')->nullable();
            $table->string('barangay', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('zip_code', 20)->nullable();
            $table->string('country', 100)->nullable()->default('Philippines');

            // Emergency contact
            $table->string('emergency_contact_name', 150)->nullable();
            $table->string('emergency_contact_number', 30)->nullable();
            $table->string('emergency_contact_relationship', 80)->nullable();

            // Philippine Government IDs
            $table->string('sss_number', 30)->nullable();
            $table->string('pagibig_number', 30)->nullable();
            $table->string('philhealth_number', 30)->nullable();
            $table->string('tin_number', 30)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
