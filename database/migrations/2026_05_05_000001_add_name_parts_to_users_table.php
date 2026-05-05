<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->after('id')->default('');
            $table->string('middle_name')->after('first_name')->nullable();
            $table->string('last_name')->after('middle_name')->default('');
        });

        // Migrate existing data: split the name column into parts
        // We treat the last word as last_name and everything else as first_name
        DB::table('users')->get()->each(function ($user) {
            $parts     = preg_split('/\s+/', trim($user->name ?? ''), -1, PREG_SPLIT_NO_EMPTY);
            $lastName  = count($parts) > 1 ? array_pop($parts) : ($parts[0] ?? '');
            $firstName = implode(' ', $parts) ?: $lastName;

            DB::table('users')->where('id', $user->id)->update([
                'first_name' => $firstName,
                'last_name'  => $lastName,
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->after('id')->default('');
        });

        DB::table('users')->get()->each(function ($user) {
            $name = trim(implode(' ', array_filter([
                $user->first_name,
                $user->middle_name,
                $user->last_name,
            ])));

            DB::table('users')->where('id', $user->id)->update(['name' => $name]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'middle_name', 'last_name']);
        });
    }
};
