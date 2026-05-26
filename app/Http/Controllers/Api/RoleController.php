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
        $query = Role::orderByDesc('level');

        // Non-super_admin users must never see or assign the super_admin role
        if (! request()->user()?->hasRole('super_admin')) {
            $query->where('slug', '!=', 'super_admin');
        }

        return RoleResource::collection($query->get());
    }
}
