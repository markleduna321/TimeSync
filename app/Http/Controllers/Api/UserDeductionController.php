<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserDeductionRequest;
use App\Http\Resources\UserDeductionResource;
use App\Models\User;
use App\Models\UserDeduction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserDeductionController extends Controller
{
    public function index(User $user): AnonymousResourceCollection
    {
        $this->authorize('update', $user); // admins only

        $deductions = UserDeduction::with('deductionType', 'addedBy')
            ->where('user_id', $user->id)
            ->orderByDesc('is_active')
            ->orderBy('effective_from')
            ->get();

        return UserDeductionResource::collection($deductions);
    }

    public function store(StoreUserDeductionRequest $request, User $user): UserDeductionResource
    {
        $this->authorize('update', $user);

        $deduction = UserDeduction::create(array_merge(
            $request->validated(),
            ['user_id' => $user->id, 'added_by' => $request->user()->id]
        ));

        $deduction->load('deductionType', 'addedBy');

        return new UserDeductionResource($deduction);
    }

    public function destroy(User $user, UserDeduction $deduction): JsonResponse
    {
        $this->authorize('update', $user);

        // Soft-deactivate instead of hard delete (preserves payslip history)
        $deduction->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
