<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Mail\WelcomeEmail;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\User;
use App\Services\UserStatusService;
use Carbon\Carbon;
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

        // Admins must never see super_admin accounts (Gate::before bypasses policies)
        if (! $request->user()->hasRole('super_admin')) {
            $query->whereDoesntHave('roles', fn ($q) => $q->where('slug', 'super_admin'));
        }

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

        $perPage  = min((int) $request->input('per_page', 20), 500);
        $paginator = $query->paginate($perPage);

        // Eager-load live status data for the current page only (bounded by perPage).
        // This keeps the query count flat regardless of how many total users exist.
        $this->attachCurrentStatus($paginator->getCollection());

        return UserResource::collection($paginator);
    }

    /**
     * Attach a `current_status` block to every user in the given collection.
     * Performs 4 indexed queries total (one per relation) for the whole page.
     */
    private function attachCurrentStatus(\Illuminate\Support\Collection $users): void
    {
        if ($users->isEmpty()) {
            return;
        }

        $now         = Carbon::now();
        $todayStr    = $now->toDateString();
        $userIds     = $users->pluck('id')->all();

        // 1) Today's TimeLog (scoped to today via the relation)
        $logs = \App\Models\TimeLog::whereIn('user_id', $userIds)
            ->where('date', $todayStr)
            ->get()
            ->keyBy('user_id');

        // 2) User break config (single batched query)
        $breakConfigs = \App\Models\UserBreakConfig::whereIn('user_id', $userIds)
            ->get()
            ->keyBy('user_id');

        // 3) Approved leave applications covering today
        $leaves = LeaveApplication::whereIn('user_id', $userIds)
            ->where('status', 'approved')
            ->where('start_date', '<=', $todayStr)
            ->where('end_date',   '>=', $todayStr)
            ->get()
            ->keyBy('user_id');

        // 4) Today's holiday (single global row)
        $holiday = Holiday::where('date', $todayStr)->first();

        foreach ($users as $user) {
            $user->setRelation('todayTimeLog', $logs->get($user->id));
            $user->setRelation('breakConfig',  $breakConfigs->get($user->id) ?? $user->breakConfig);
            $user->setAttribute(
                'current_status',
                UserStatusService::resolve(
                    $user,
                    $logs->get($user->id),
                    $user->schedule,
                    $breakConfigs->get($user->id),
                    $leaves->get($user->id),
                    $holiday,
                    $now
                )
            );
        }
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
        // Gate::before grants admin full policy bypass — enforce at controller level
        if (! request()->user()->hasRole('super_admin') && $user->hasRole('super_admin')) {
            abort(403, 'You are not authorized to view this user.');
        }

        $this->authorize('view', $user);

        $user->load(['roles', 'schedule', 'department', 'account']);

        return new UserResource($user);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        // Gate::before grants admin full policy bypass — enforce at controller level
        if (! $request->user()->hasRole('super_admin') && $user->hasRole('super_admin')) {
            abort(403, 'You are not authorized to update this user.');
        }

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
        // Gate::before grants admin full policy bypass — enforce at controller level
        if (! request()->user()->hasRole('super_admin') && $user->hasRole('super_admin')) {
            abort(403, 'You are not authorized to delete this user.');
        }

        $this->authorize('delete', $user);

        $user->delete();

        return response()->json(null, 204);
    }
}
