<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateChangePasswordRequest;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class ChangePasswordController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('auth/ChangePassword');
    }

    public function update(UpdateChangePasswordRequest $request)
    {
        $user = $request->user();

        $user->update([
            'password'             => Hash::make($request->password),
            'must_change_password' => false,
        ]);

        return redirect()->intended(route('dashboard'));
    }
}
