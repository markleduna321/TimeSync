<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RoleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $roles = Role::orderByDesc('level')->get();
        return RoleResource::collection($roles);
    }
}
