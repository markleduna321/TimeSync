<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeaveTypeRequest;
use App\Http\Resources\LeaveTypeResource;
use App\Models\LeaveCreditPolicy;
use App\Models\LeaveType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeaveTypeController extends Controller
{
    /**
     * GET /api/leave/types
     * Returns all leave types with their credit policy.
     */
    public function index(): AnonymousResourceCollection
    {
        $types = LeaveType::with('creditPolicy')->orderBy('name')->get();

        return LeaveTypeResource::collection($types);
    }

    /**
     * POST /api/leave/types
     */
    public function store(StoreLeaveTypeRequest $request): LeaveTypeResource
    {
        $leaveType = LeaveType::create($request->only([
            'name', 'code', 'color', 'min_advance_days',
            'max_consecutive_days', 'requires_proof_above_days',
            'is_paid', 'is_active', 'is_monetizable',
        ]));

        $this->upsertPolicy($leaveType, $request->input('policy'));

        return new LeaveTypeResource($leaveType->load('creditPolicy'));
    }

    /**
     * PUT /api/leave/types/{type}
     */
    public function update(StoreLeaveTypeRequest $request, LeaveType $type): LeaveTypeResource
    {
        $type->update($request->only([
            'name', 'code', 'color', 'min_advance_days',
            'max_consecutive_days', 'requires_proof_above_days',
            'is_paid', 'is_active', 'is_monetizable',
        ]));

        $this->upsertPolicy($type, $request->input('policy'));

        return new LeaveTypeResource($type->fresh()->load('creditPolicy'));
    }

    /**
     * DELETE /api/leave/types/{type}
     */
    public function destroy(LeaveType $type): JsonResponse
    {
        $this->authorize('create', \App\Models\User::class); // reuse admin check

        $type->delete();

        return response()->json(null, 204);
    }

    private function upsertPolicy(LeaveType $leaveType, ?array $policyData): void
    {
        if (empty($policyData)) return;

        LeaveCreditPolicy::updateOrCreate(
            ['leave_type_id' => $leaveType->id],
            array_filter([
                'allocation_type' => $policyData['allocation_type'] ?? null,
                'monthly_rate'    => $policyData['monthly_rate']    ?? null,
                'annual_amount'   => $policyData['annual_amount']   ?? null,
                'is_active'       => $policyData['is_active']       ?? true,
            ], fn ($v) => $v !== null)
        );
    }
}
