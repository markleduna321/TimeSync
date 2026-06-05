<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AllowanceTypeController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AttendanceCorrectionController;
use App\Http\Controllers\Api\BreakConfigController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DeductionTypeController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\LeaveApplicationController;
use App\Http\Controllers\Api\LeaveCreditController;
use App\Http\Controllers\Api\LeaveMonetizationController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\ThirteenthMonthController;
use App\Http\Controllers\Api\TimesheetController;
use App\Http\Controllers\Api\TimeLogController;
use App\Http\Controllers\Api\UserAllowanceController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserDeductionController;
use App\Http\Controllers\Api\UserGovernmentDeductionController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\UserExperienceController;
use App\Http\Controllers\Api\UserDocumentController;
use App\Http\Controllers\Api\AdminUserDocumentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are intended for RTK Query endpoints and must return JSON.
|
*/

Route::middleware('auth:sanctum')->group(function () {
    // User profile
    Route::get('/user',             [UserController::class, 'me']);
    Route::post('/user/avatar',     [UserController::class, 'updateAvatar']);
    Route::patch('/user/email',     [UserController::class, 'updateEmail']);
    Route::patch('/user/password',  [UserController::class, 'updatePassword']);

    // Extended profile (user_profiles / experiences / documents)
    Route::get('/profile',    [UserProfileController::class, 'show']);
    Route::put('/profile',    [UserProfileController::class, 'update']);
    Route::get('/profile/experiences',               [UserExperienceController::class, 'index']);
    Route::post('/profile/experiences',              [UserExperienceController::class, 'store']);
    Route::patch('/profile/experiences/{experience}',[UserExperienceController::class, 'update']);
    Route::delete('/profile/experiences/{experience}',[UserExperienceController::class, 'destroy']);
    Route::get('/profile/documents',                 [UserDocumentController::class, 'index']);
    Route::post('/profile/documents',                [UserDocumentController::class, 'store']);
    Route::delete('/profile/documents/{document}',   [UserDocumentController::class, 'destroy']);

    // --- Admin: 201 File / Document management ---
    Route::get('/admin/users/{user}/documents',               [AdminUserDocumentController::class, 'index']);
    Route::post('/admin/users/{user}/documents',              [AdminUserDocumentController::class, 'store']);
    Route::delete('/admin/users/{user}/documents/{document}', [AdminUserDocumentController::class, 'destroy']);

    // --- Notifications ---
    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::get('/notifications/count',        [NotificationController::class, 'count']);
    Route::patch('/notifications/{id}/read',  [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all',    [NotificationController::class, 'markAllRead']);

    // --- Time Log (employee-scoped) ---
    Route::prefix('time-log')->group(function () {
        Route::get('/today',       [TimeLogController::class, 'today']);
        Route::get('/history',     [TimeLogController::class, 'history']);
        Route::post('/clock-in',   [TimeLogController::class, 'clockIn']);
        Route::post('/clock-out',  [TimeLogController::class, 'clockOut']);
        Route::post('/lunch-start',[TimeLogController::class, 'lunchStart']);
        Route::post('/lunch-end',  [TimeLogController::class, 'lunchEnd']);
        Route::post('/break-start',[TimeLogController::class, 'breakStart']);
        Route::post('/break-end',  [TimeLogController::class, 'breakEnd']);
    });

    // --- Timesheets ---
    Route::get('/timesheets/subjects', [TimesheetController::class, 'subjects']);
    Route::get('/timesheets',          [TimesheetController::class, 'index']);

    // --- Attendance ---
    Route::get('/attendance',                          [AttendanceController::class, 'calendar']);
    Route::get('/attendance/corrections',              [AttendanceCorrectionController::class, 'index']);
    Route::post('/attendance/corrections',             [AttendanceCorrectionController::class, 'store']);
    Route::patch('/attendance/corrections/{correction}', [AttendanceCorrectionController::class, 'review']);

    // --- Schedules ---
    Route::get('/schedule/me',       [ScheduleController::class, 'mySchedule']);
    Route::get('/schedules',         [ScheduleController::class, 'index']);
    Route::put('/schedules/{user}',  [ScheduleController::class, 'upsert']);

    // --- Break Configs ---
    Route::get('/break-config/me',         [BreakConfigController::class, 'mine']);
    Route::get('/break-config/{user}',     [BreakConfigController::class, 'show']);
    Route::put('/break-config/{user}',     [BreakConfigController::class, 'upsert']);

    // --- Roles (dropdown list — any authenticated user) ---
    Route::get('/roles', [RoleController::class, 'index']);

    // --- Admin: User management ---
    Route::apiResource('admin/users', AdminUserController::class);

    // --- Teams ---
    Route::apiResource('teams', TeamController::class);

    // --- Holidays ---
    Route::get('/holidays',              [HolidayController::class, 'index']);
    Route::post('/holidays',             [HolidayController::class, 'store']);
    Route::patch('/holidays/{holiday}',  [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

    // --- Deduction Types ---
    Route::get('/deduction-types',           [DeductionTypeController::class, 'index']);
    Route::post('/deduction-types',          [DeductionTypeController::class, 'store']);
    Route::patch('/deduction-types/{type}',  [DeductionTypeController::class, 'update']);
    Route::delete('/deduction-types/{type}', [DeductionTypeController::class, 'destroy']);

    // --- User Deductions ---
    Route::get('/users/{user}/deductions',              [UserDeductionController::class, 'index']);
    Route::post('/users/{user}/deductions',             [UserDeductionController::class, 'store']);
    Route::delete('/users/{user}/deductions/{deduction}', [UserDeductionController::class, 'destroy']);

    // --- Allowance Types ---
    Route::get('/allowance-types',              [AllowanceTypeController::class, 'index']);
    Route::post('/allowance-types',             [AllowanceTypeController::class, 'store']);
    Route::patch('/allowance-types/{type}',     [AllowanceTypeController::class, 'update']);
    Route::delete('/allowance-types/{type}',    [AllowanceTypeController::class, 'destroy']);

    // --- User Allowances ---
    Route::get('/users/{user}/allowances',              [UserAllowanceController::class, 'index']);
    Route::post('/users/{user}/allowances',             [UserAllowanceController::class, 'store']);
    Route::delete('/users/{user}/allowances/{allowance}', [UserAllowanceController::class, 'destroy']);

    // --- Government Contribution Toggles (per user) ---
    Route::get('/users/{user}/government-deductions',          [UserGovernmentDeductionController::class, 'index']);
    Route::patch('/users/{user}/government-deductions/{code}', [UserGovernmentDeductionController::class, 'update']);

    // --- Departments ---
    Route::get('/departments',                   [DepartmentController::class, 'index']);
    Route::post('/departments',                  [DepartmentController::class, 'store']);
    Route::patch('/departments/{department}',    [DepartmentController::class, 'update']);
    Route::delete('/departments/{department}',   [DepartmentController::class, 'destroy']);

    // --- Accounts ---
    Route::get('/accounts',              [AccountController::class, 'index']);
    Route::post('/accounts',             [AccountController::class, 'store']);
    Route::patch('/accounts/{account}',  [AccountController::class, 'update']);
    Route::delete('/accounts/{account}', [AccountController::class, 'destroy']);

    // --- 13th Month Pay ---
    Route::get('/13th-month',          [ThirteenthMonthController::class, 'index']);
    Route::post('/13th-month/generate',[ThirteenthMonthController::class, 'generate']);

    // --- Payslips ---
    Route::get('/payslips',                      [PayslipController::class, 'index']);
    Route::post('/payslips',                     [PayslipController::class, 'generate']);
    Route::get('/payslips/13th-month',           [PayslipController::class, 'thirteenthMonth']);
    Route::post('/payslips/bulk-draft',          [PayslipController::class, 'bulkDraft']);
    Route::post('/payslips/bulk-release',        [PayslipController::class, 'bulkRelease']);
    Route::get('/payslips/{payslip}',            [PayslipController::class, 'show']);
    Route::patch('/payslips/{payslip}/release',  [PayslipController::class, 'release']);
    Route::delete('/payslips/{payslip}',         [PayslipController::class, 'destroy']);

    // --- Dashboard ---
    Route::prefix('dashboard')->group(function () {
        Route::get('/admin-kpis',     [DashboardController::class, 'adminKpis']);
        Route::get('/admin-activity', [DashboardController::class, 'adminActivity']);
        Route::get('/employee-kpis',  [DashboardController::class, 'employeeKpis']);
    });

    // --- Reports ---
    Route::prefix('reports')->group(function () {
        Route::get('/payroll-summary',    [ReportController::class, 'payrollSummary']);
        Route::get('/payroll-trend',      [ReportController::class, 'payrollTrend']);
        Route::get('/attendance',         [ReportController::class, 'attendanceSummary']);
        Route::get('/contributions',      [ReportController::class, 'contributionsSummary']);
        Route::get('/department-payroll', [ReportController::class, 'departmentPayroll']);
        Route::get('/leave-utilization',  [ReportController::class, 'leaveUtilization']);
        Route::post('/ai-insights',       [ReportController::class, 'aiInsights']);
    });

    // --- Leave Types (admin) ---
    Route::get('/leave/types',            [LeaveTypeController::class, 'index']);
    Route::post('/leave/types',           [LeaveTypeController::class, 'store']);
    Route::put('/leave/types/{type}',     [LeaveTypeController::class, 'update']);
    Route::delete('/leave/types/{type}',  [LeaveTypeController::class, 'destroy']);

    // --- Leave Applications ---
    Route::get('/leave/applications',                   [LeaveApplicationController::class, 'index']);
    Route::post('/leave/applications',                  [LeaveApplicationController::class, 'store']);
    Route::get('/leave/applications/{application}',     [LeaveApplicationController::class, 'show']);
    Route::patch('/leave/applications/{application}/review', [LeaveApplicationController::class, 'review']);
    Route::delete('/leave/applications/{application}',  [LeaveApplicationController::class, 'cancel']);

    // --- Leave Credits ---
    Route::get('/leave/credits/me',                                          [LeaveCreditController::class, 'myCredits']);
    Route::get('/admin/users/{user}/leave-credits',                          [LeaveCreditController::class, 'userCredits']);
    Route::post('/admin/users/{user}/leave-credits/assign',                  [LeaveCreditController::class, 'assign']);
    Route::delete('/admin/users/{user}/leave-credits/{leaveType}',           [LeaveCreditController::class, 'removeAssignment']);
    Route::post('/admin/users/{user}/leave-credits',                         [LeaveCreditController::class, 'upsert']);
    Route::post('/admin/leave-credits/bulk-allocate',                        [LeaveCreditController::class, 'bulkAllocate']);

    // --- Leave Monetization ---
    // bulk-process must come before {monetization} to avoid route conflict
    Route::patch('/admin/leave-monetizations/bulk-process', [LeaveMonetizationController::class, 'bulkProcess']);
    Route::get('/admin/leave-monetizations',                [LeaveMonetizationController::class, 'index']);
    Route::post('/admin/leave-monetizations/run',           [LeaveMonetizationController::class, 'run']);
    Route::patch('/admin/leave-monetizations/{monetization}', [LeaveMonetizationController::class, 'process']);
});

