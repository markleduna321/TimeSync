<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Account;
use App\Models\AllowanceType;
use App\Models\AttendanceCorrection;
use App\Models\Department;
use App\Models\DeductionType;
use App\Models\Holiday;
use App\Models\Payslip;
use App\Models\Schedule;
use App\Models\ScheduleOverride;
use App\Models\Team;
use App\Models\TimeLog;
use App\Models\TrainingEntry;
use App\Models\User;
use App\Models\UserAllowance;
use App\Models\UserBreakConfig;
use App\Models\UserDocument;
use App\Models\UserExperience;
use App\Models\UserProfile;
use App\Policies\AccountPolicy;
use App\Policies\AllowanceTypePolicy;
use App\Policies\AttendanceCorrectionPolicy;
use App\Policies\BreakConfigPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\DeductionTypePolicy;
use App\Policies\HolidayPolicy;
use App\Policies\PayslipPolicy;
use App\Policies\SchedulePolicy;
use App\Policies\ScheduleOverridePolicy;
use App\Policies\TeamPolicy;
use App\Policies\TimeLogPolicy;
use App\Policies\TrainingEntryPolicy;
use App\Policies\UserAllowancePolicy;
use App\Policies\UserDocumentPolicy;
use App\Policies\UserExperiencePolicy;
use App\Policies\UserPolicy;
use App\Policies\UserProfilePolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Account::class              => AccountPolicy::class,
        AllowanceType::class        => AllowanceTypePolicy::class,
        AttendanceCorrection::class => AttendanceCorrectionPolicy::class,
        Department::class           => DepartmentPolicy::class,
        DeductionType::class        => DeductionTypePolicy::class,
        Holiday::class              => HolidayPolicy::class,
        Payslip::class              => PayslipPolicy::class,
        User::class                 => UserPolicy::class,
        UserAllowance::class        => UserAllowancePolicy::class,
        TimeLog::class              => TimeLogPolicy::class,
        Schedule::class             => SchedulePolicy::class,
        ScheduleOverride::class     => ScheduleOverridePolicy::class,
        UserBreakConfig::class      => BreakConfigPolicy::class,
        Team::class                 => TeamPolicy::class,
        TrainingEntry::class        => TrainingEntryPolicy::class,
        UserDocument::class         => UserDocumentPolicy::class,
        UserExperience::class       => UserExperiencePolicy::class,
        UserProfile::class          => UserProfilePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Privileged users bypass all policy checks globally.
        Gate::before(function ($user, $ability) {
            if ($user->hasAnyRole(['super_admin', 'admin', 'manager'])) {
                return true;
            }
        });
    }
}