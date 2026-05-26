<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ChangePasswordController;
use App\Http\Controllers\Api\AttendanceCorrectionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::get('/dashboard', function () {
    return Inertia::render('home-page/page');
})->middleware(['auth', 'password.changed'])->name('dashboard');

Route::middleware(['auth', 'password.changed'])->group(function () {
    Route::get('/admin/users',         fn () => Inertia::render('admin/users/page'))->name('admin.users');
    Route::get('/admin/compensation',  fn () => Inertia::render('admin/compensation/page'))->name('admin.compensation');
    Route::get('/admin/organization',  fn () => Inertia::render('admin/organization/page'))->name('admin.organization');
    Route::get('/admin/holidays',      fn () => Inertia::render('admin/holidays/page'))->name('admin.holidays');
    Route::get('/admin/payroll',      fn () => Inertia::render('admin/payroll/page'))->name('admin.payroll');
    Route::get('/admin/reports',          fn () => Inertia::render('admin/reports/page'))->name('admin.reports');
    Route::get('/admin/leave-monetization', fn () => Inertia::render('admin/leave-monetization/page'))->name('admin.leave-monetization');
    Route::get('/teams',            fn () => Inertia::render('teams/page'))->name('teams.index');
    Route::get('/time/my-time',     fn () => Inertia::render('time/my-time/page'))->name('time.my-time');
    Route::get('/time/timesheets',  fn () => Inertia::render('time/timesheets/page'))->name('time.timesheets');
    Route::get('/time/attendance',  fn () => Inertia::render('time/attendance/page'))->name('time.attendance');
    Route::get('/time/payslips',    fn () => Inertia::render('time/payslips/page'))->name('time.payslips');
    // Proof download — web route so it streams through Laravel auth middleware
    Route::get('/attendance/corrections/{correction}/proof', [AttendanceCorrectionController::class, 'proof'])
        ->name('attendance.corrections.proof');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/password/change',  [ChangePasswordController::class, 'show'])->name('password.change');
    Route::post('/password/change', [ChangePasswordController::class, 'update'])->name('password.change.update');
});

require __DIR__.'/auth.php';
