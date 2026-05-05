<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserAllowanceRequest;
use App\Http\Resources\UserAllowanceResource;
use App\Models\User;
use App\Models\UserAllowance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserAllowanceController extends Controller
{
    public function index(Request $request, User $user): JsonResponse
    {
        $this->authorize('viewAny', [UserAllowance::class, $user]);

        $allowances = UserAllowance::with('allowanceType')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(UserAllowanceResource::collection($allowances));
    }

    public function store(StoreUserAllowanceRequest $request, User $user): JsonResponse
    {
        $this->authorize('create', UserAllowance::class);

        $allowance = UserAllowance::create([
            'user_id' => $user->id,
            ...$request->validated(),
        ]);

        $allowance->load('allowanceType');

        return response()->json(new UserAllowanceResource($allowance), 201);
    }

    public function destroy(Request $request, User $user, UserAllowance $allowance): JsonResponse
    {
        $this->authorize('delete', $allowance);

        $allowance->delete();

        return response()->json(null, 204);
    }
}
