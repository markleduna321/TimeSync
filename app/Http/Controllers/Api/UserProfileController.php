<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserProfileRequest;
use App\Http\Resources\UserProfileResource;
use App\Models\UserDocument;
use App\Models\UserProfile;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    /**
     * Return the authenticated user's extended profile, creating an empty
     * profile record on first access if one does not yet exist.
     */
    public function show(Request $request): UserProfileResource
    {
        $user    = $request->user()->load('roles');
        $profile = UserProfile::firstOrCreate(['user_id' => $user->id]);
        $this->authorize('view', $profile);

        $hasResume = UserDocument::where('user_id', $user->id)
            ->where('type', 'resume')
            ->exists();

        return new UserProfileResource([
            'user'       => $user,
            'profile'    => $profile,
            'has_resume' => $hasResume,
        ]);
    }

    /**
     * Update the authenticated user's extended profile.
     */
    public function update(UpdateUserProfileRequest $request): UserProfileResource
    {
        $user    = $request->user()->load('roles');
        $profile = UserProfile::firstOrCreate(['user_id' => $user->id]);
        $this->authorize('update', $profile);

        $profile->update($request->validated());

        $hasResume = UserDocument::where('user_id', $user->id)
            ->where('type', 'resume')
            ->exists();

        return new UserProfileResource([
            'user'       => $user,
            'profile'    => $profile->fresh(),
            'has_resume' => $hasResume,
        ]);
    }
}
