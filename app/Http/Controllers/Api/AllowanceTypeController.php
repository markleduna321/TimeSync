<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAllowanceTypeRequest;
use App\Http\Requests\UpdateAllowanceTypeRequest;
use App\Http\Resources\AllowanceTypeResource;
use App\Models\AllowanceType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AllowanceTypeController extends Controller
{
    /**
     * GET /api/allowance-types
     * Pass ?active_only=1 for dropdown use; omit for full admin list.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AllowanceType::orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return AllowanceTypeResource::collection($query->get());
    }

    /**
     * POST /api/allowance-types — admin only.
     */
    public function store(StoreAllowanceTypeRequest $request): AllowanceTypeResource
    {
        $this->authorize('create', AllowanceType::class);

        $type = AllowanceType::create([
            'name'                     => $request->name,
            'code'                     => strtoupper($request->code),
            'is_taxable'               => $request->boolean('is_taxable'),
            'monthly_de_minimis_limit' => $request->boolean('is_taxable') ? null : $request->monthly_de_minimis_limit,
            'description'              => $request->description,
            'is_active'                => true,
        ]);

        return new AllowanceTypeResource($type);
    }

    /**
     * PATCH /api/allowance-types/{type} — admin only.
     */
    public function update(UpdateAllowanceTypeRequest $request, AllowanceType $type): AllowanceTypeResource
    {
        $this->authorize('update', AllowanceType::class);

        $data = $request->validated();

        // Clear de-minimis limit if switching to taxable
        if (isset($data['is_taxable']) && $data['is_taxable']) {
            $data['monthly_de_minimis_limit'] = null;
        }

        $type->update($data);

        return new AllowanceTypeResource($type->fresh());
    }

    /**
     * DELETE /api/allowance-types/{type} — soft-deactivate only.
     */
    public function destroy(AllowanceType $type): JsonResponse
    {
        $this->authorize('delete', AllowanceType::class);

        $type->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
