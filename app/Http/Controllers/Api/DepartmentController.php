<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DepartmentController extends Controller
{
    /**
     * GET /api/departments
     * Pass ?active_only=1 to filter for dropdown use.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Department::class);

        $query = Department::orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return DepartmentResource::collection($query->get());
    }

    /**
     * POST /api/departments
     */
    public function store(StoreDepartmentRequest $request): DepartmentResource
    {
        $this->authorize('create', Department::class);

        $department = Department::create([
            'name'        => $request->name,
            'code'        => strtoupper($request->code),
            'description' => $request->description,
            'is_active'   => true,
        ]);

        return new DepartmentResource($department);
    }

    /**
     * PATCH /api/departments/{department}
     */
    public function update(UpdateDepartmentRequest $request, Department $department): DepartmentResource
    {
        $this->authorize('update', Department::class);

        $data = $request->validated();

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $department->update($data);

        return new DepartmentResource($department->fresh());
    }

    /**
     * DELETE /api/departments/{department} — soft-deactivate only.
     */
    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', Department::class);

        $department->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
