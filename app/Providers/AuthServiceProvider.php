<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\AttendanceCorrection;
use App\Models\Holiday;
use App\Models\Payslip;
use App\Models\Schedule;
use App\Models\Team;
use App\Models\TimeLog;
use App\Models\User;
use App\Models\UserAllowance;
use App\Models\UserBreakConfig;
use App\Policies\AttendanceCorrectionPolicy;
use App\Policies\BreakConfigPolicy;
use App\Policies\HolidayPolicy;
use App\Policies\PayslipPolicy;
use App\Policies\SchedulePolicy;
use App\Policies\TeamPolicy;
use App\Policies\TimeLogPolicy;
use App\Policies\UserAllowancePolicy;
use App\Policies\UserPolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        AttendanceCorrection::class => AttendanceCorrectionPolicy::class,
        Holiday::class         => HolidayPolicy::class,
        Payslip::class         => PayslipPolicy::class,
        User::class            => UserPolicy::class,
        UserAllowance::class   => UserAllowancePolicy::class,
        TimeLog::class         => TimeLogPolicy::class,
        Schedule::class        => SchedulePolicy::class,
        UserBreakConfig::class => BreakConfigPolicy::class,
        Team::class            => TeamPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
