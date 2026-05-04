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
    Route::get('/admin/users',      fn () => Inertia::render('admin/users/page'))->name('admin.users');
    Route::get('/admin/schedules',  fn () => Inertia::render('admin/schedules/page'))->name('admin.schedules');
    Route::get('/teams',            fn () => Inertia::render('teams/page'))->name('teams.index');
    Route::get('/time/my-time',     fn () => Inertia::render('time/my-time/page'))->name('time.my-time');
    Route::get('/time/timesheets',  fn () => Inertia::render('time/timesheets/page'))->name('time.timesheets');
    Route::get('/time/attendance',  fn () => Inertia::render('time/attendance/page'))->name('time.attendance');
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
