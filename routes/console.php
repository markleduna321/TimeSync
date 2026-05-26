<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Accrue monthly leave credits on the 1st of every month at midnight.
Schedule::command('leave:accrue-monthly')->monthlyOn(1, '00:00');

// Year-end leave monetization — runs at 00:05 on January 1st each year.
Schedule::command('leave:monetize')->yearlyOn(1, 1, '00:05');

// Annual lump-sum leave credit allocation — runs at 00:10 on January 1st, after monetization zeroes the previous year.
Schedule::command('leave:allocate-annual')->yearlyOn(1, 1, '00:10');
