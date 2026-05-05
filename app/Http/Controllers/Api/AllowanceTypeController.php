<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AllowanceTypeResource;
use App\Models\AllowanceType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AllowanceTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $types = AllowanceType::orderBy('name')->get();

        return response()->json(AllowanceTypeResource::collection($types));
    }
}
