<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Mail\WelcomeEmail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AdminUserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $query = User::with(['roles', 'schedule', 'department', 'account'])
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('middle_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        if ($role = $request->input('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('slug', $role));
        }

        if ($departmentId = $request->input('department_id')) {
            $query->where('department_id', (int) $departmentId);
        }

        $perPage = min((int) $request->input('per_page', 20), 500);

        return UserResource::collection($query->paginate($perPage));
    }

    public function store(StoreUserRequest $request): UserResource
    {
        $this->authorize('create', User::class);

        // Determine if the new user is a super_admin (skip forced password change)
        $roleIds      = $request->input('roles', []);
        $isSuperAdmin = \App\Models\Role::whereIn('id', $roleIds)
            ->where('slug', 'super_admin')
            ->exists();

        // Capture plain password before hashing — needed for the welcome email
        $plainPassword = $request->filled('password')
            ? $request->password
            : config('app.default_user_password');

        $user = User::create([
            'first_name'           => $request->first_name,
            'middle_name'          => $request->middle_name,
            'last_name'            => $request->last_name,
            'email'                => $request->email,
            'password'             => Hash::make($plainPassword),
            'monthly_salary'       => $request->monthly_salary,
            'must_change_password' => ! $isSuperAdmin,
        ]);

        if ($request->filled('roles')) {
            $user->roles()->sync($request->roles);
        }

        $user->load(['roles', 'schedule', 'department', 'account']);

        Mail::to($user->email)->send(new WelcomeEmail($user, $plainPassword));

        return new UserResource($user);
    }

    public function show(User $user): UserResource
    {
        $this->authorize('view', $user);

        $user->load(['roles', 'schedule', 'department', 'account']);

        return new UserResource($user);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $this->authorize('update', $user);

        $data = $request->validated();

        if (isset($data['password']) && filled($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        // If the admin changed their OWN password, refresh the auth guard's cached
        // user so Sanctum's AuthenticateSession stores the NEW hash in the session.
        // Without this, the next request sees a hash mismatch and returns 401.
        if ($user->id === $request->user()->id && isset($data['password'])) {
            Auth::setUser($user);
        }

        // Only admins may change roles; block self-modification of roles.
        if ($request->has('roles') && $request->user()->hasAnyRole(['super_admin', 'admin'])) {
            $user->roles()->sync($request->roles);
        }

        $user->load(['roles', 'schedule', 'department', 'account']);

        return new UserResource($user);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->delete();

        return response()->json(null, 204);
    }
}
