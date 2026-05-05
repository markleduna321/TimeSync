<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AllowanceTypeController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AttendanceCorrectionController;
use App\Http\Controllers\Api\BreakConfigController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DeductionTypeController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\TimeLogController;
use App\Http\Controllers\Api\TimesheetController;
use App\Http\Controllers\Api\UserAllowanceController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserDeductionController;
use App\Http\Controllers\Api\UserGovernmentDeductionController;

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
    Route::get('/user', [UserController::class, 'me']);
    Route::put('/user', [UserController::class, 'update']);

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

    // --- Payslips ---
    Route::get('/payslips',                      [PayslipController::class, 'index']);
    Route::post('/payslips',                     [PayslipController::class, 'generate']);
    Route::get('/payslips/13th-month',           [PayslipController::class, 'thirteenthMonth']);
    Route::post('/payslips/bulk-draft',          [PayslipController::class, 'bulkDraft']);
    Route::post('/payslips/bulk-release',        [PayslipController::class, 'bulkRelease']);
    Route::get('/payslips/{payslip}',            [PayslipController::class, 'show']);
    Route::patch('/payslips/{payslip}/release',  [PayslipController::class, 'release']);
    Route::delete('/payslips/{payslip}',         [PayslipController::class, 'destroy']);
});

