<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBreakConfigRequest;
use App\Http\Resources\BreakConfigResource;
use App\Models\User;
use App\Models\UserBreakConfig;
use Illuminate\Http\Request;

class BreakConfigController extends Controller
{
    public function mine(Request $request): BreakConfigResource
    {
        $config = UserBreakConfig::where('user_id', auth()->id())->first();
        return new BreakConfigResource($config ?? new UserBreakConfig());
    }

    public function show(Request $request, User $user): BreakConfigResource
    {
        $this->authorize('viewAny', UserBreakConfig::class);

        $config = UserBreakConfig::where('user_id', $user->id)->first();
        return new BreakConfigResource($config ?? new UserBreakConfig());
    }

    public function upsert(StoreBreakConfigRequest $request, User $user): BreakConfigResource
    {
        $config = UserBreakConfig::firstOrNew(['user_id' => $user->id]);

        if ($config->exists) {
            $this->authorize('update', $config);
        } else {
            $this->authorize('create', UserBreakConfig::class);
        }

        $config->fill(array_merge($request->validated(), ['user_id' => $user->id]));
        $config->save();

        return new BreakConfigResource($config);
    }
}
