<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeductionTypeResource;
use App\Models\DeductionType;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DeductionTypeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $types = DeductionType::where('is_active', true)->orderBy('name')->get();

        return DeductionTypeResource::collection($types);
    }
}
