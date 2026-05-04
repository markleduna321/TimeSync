<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BreakConfigController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\TimeLogController;
use App\Http\Controllers\Api\UserController;

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
        Route::post('/clock-in',   [TimeLogController::class, 'clockIn']);
        Route::post('/clock-out',  [TimeLogController::class, 'clockOut']);
        Route::post('/lunch-start',[TimeLogController::class, 'lunchStart']);
        Route::post('/lunch-end',  [TimeLogController::class, 'lunchEnd']);
        Route::post('/break-start',[TimeLogController::class, 'breakStart']);
        Route::post('/break-end',  [TimeLogController::class, 'breakEnd']);
    });

    // --- Schedules ---
    Route::get('/schedule/me',       [ScheduleController::class, 'mySchedule']);
    Route::get('/schedules',         [ScheduleController::class, 'index']);
    Route::put('/schedules/{user}',  [ScheduleController::class, 'upsert']);

    // --- Break Configs ---
    Route::get('/break-config/me',         [BreakConfigController::class, 'mine']);
    Route::get('/break-config/{user}',     [BreakConfigController::class, 'show']);
    Route::put('/break-config/{user}',     [BreakConfigController::class, 'upsert']);
});

