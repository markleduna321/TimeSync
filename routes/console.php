<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Accrue monthly leave credits on the 1st of every month at midnight.
Schedule::command('leave:accrue-monthly')->monthlyOn(1, '00:00');
