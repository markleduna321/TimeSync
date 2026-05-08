<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->foreign('user_id', 'sched_uid_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->json('work_days');                          // ["Mon","Tue","Wed","Thu","Fri"]
            $table->time('shift_start');                        // "08:00"
            $table->time('shift_end');                          // "17:00"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
