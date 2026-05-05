<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeductionTypeRequest;
use App\Http\Requests\UpdateDeductionTypeRequest;
use App\Http\Resources\DeductionTypeResource;
use App\Models\DeductionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DeductionTypeController extends Controller
{
    /**
     * GET /api/deduction-types
     * Pass ?active_only=1 to filter for dropdown use; omit for full admin list.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = DeductionType::orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return DeductionTypeResource::collection($query->get());
    }

    /**
     * POST /api/deduction-types — admin only, creates custom (non-govt) types.
     */
    public function store(StoreDeductionTypeRequest $request): DeductionTypeResource
    {
        $this->authorize('create', DeductionType::class);

        $type = DeductionType::create([
            'name'             => $request->name,
            'code'             => strtoupper($request->code),
            'is_government'    => false,
            'is_auto_computed' => false,
            'is_assignable'    => true,
            'is_active'        => $request->input('is_active', true),
        ]);

        return new DeductionTypeResource($type);
    }

    /**
     * PATCH /api/deduction-types/{type} — admin only, custom types only.
     */
    public function update(UpdateDeductionTypeRequest $request, DeductionType $type): DeductionTypeResource
    {
        $this->authorize('update', DeductionType::class);

        if ($type->is_government) {
            abort(403, 'Government deduction types cannot be modified.');
        }

        $type->update($request->validated());

        return new DeductionTypeResource($type->fresh());
    }

    /**
     * DELETE /api/deduction-types/{type} — soft-deactivates, no hard delete.
     */
    public function destroy(DeductionType $type): JsonResponse
    {
        $this->authorize('delete', DeductionType::class);

        if ($type->is_government || $type->is_auto_computed) {
            abort(403, 'Government and auto-computed deduction types cannot be removed.');
        }

        $type->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
