<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAvatarRequest;
use App\Http\Requests\UpdateProfileEmailRequest;
use App\Http\Requests\UpdateProfilePasswordRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user()->load('roles');

        return response()->json((new UserResource($user))->toArray($request), 200);
    }

    public function updateAvatar(UpdateAvatarRequest $request)
    {
        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json((new UserResource($user))->toArray($request), 200);
    }

    public function updateEmail(UpdateProfileEmailRequest $request)
    {
        $user = $request->user();
        $user->update(['email' => $request->email]);

        return response()->json((new UserResource($user))->toArray($request), 200);
    }

    public function updatePassword(UpdateProfilePasswordRequest $request)
    {
        $request->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Password updated successfully.'], 200);
    }
}

