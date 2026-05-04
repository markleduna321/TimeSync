<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use App\Models\UserBreakConfig;
use App\Policies\BreakConfigPolicy;
use App\Policies\SchedulePolicy;
use App\Policies\TimeLogPolicy;
use App\Policies\UserPolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class            => UserPolicy::class,
        TimeLog::class         => TimeLogPolicy::class,
        Schedule::class        => SchedulePolicy::class,
        UserBreakConfig::class => BreakConfigPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
