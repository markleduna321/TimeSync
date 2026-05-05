<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Api\AttendanceCorrectionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::get('/dashboard', function () {
    return Inertia::render('home-page/page');
})->middleware(['auth'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/admin/users',        fn () => Inertia::render('admin/users/page'))->name('admin.users');
    Route::get('/admin/compensation', fn () => Inertia::render('admin/compensation/page'))->name('admin.compensation');
    Route::get('/admin/holidays',     fn () => Inertia::render('admin/holidays/page'))->name('admin.holidays');
    Route::get('/admin/payroll',      fn () => Inertia::render('admin/payroll/page'))->name('admin.payroll');
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
});

require __DIR__.'/auth.php';
