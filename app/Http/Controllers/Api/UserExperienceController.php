<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserExperienceRequest;
use App\Http\Requests\UpdateUserExperienceRequest;
use App\Http\Resources\UserExperienceResource;
use App\Models\UserExperience;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserExperienceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $experiences = UserExperience::where('user_id', $request->user()->id)
            ->orderByDesc('start_date')
            ->get();

        return UserExperienceResource::collection($experiences);
    }

    public function store(StoreUserExperienceRequest $request): UserExperienceResource
    {
        $experience = UserExperience::create(array_merge(
            $request->validated(),
            ['user_id' => $request->user()->id]
        ));

        return new UserExperienceResource($experience);
    }

    public function update(UpdateUserExperienceRequest $request, UserExperience $experience): UserExperienceResource
    {
        $this->authorize('update', $experience);
        $experience->update($request->validated());

        return new UserExperienceResource($experience->fresh());
    }

    public function destroy(UserExperience $experience): JsonResponse
    {
        $this->authorize('delete', $experience);
        $experience->delete();

        return response()->json(null, 204);
    }
}
