<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleRequest;
use App\Http\Resources\ScheduleResource;
use App\Http\Resources\UserResource;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ScheduleController extends Controller
{
    /** Employee: fetch own schedule. */
    public function mySchedule(Request $request): ScheduleResource
    {
        $schedule = Schedule::where('user_id', auth()->id())->first();
        return new ScheduleResource($schedule ?? new Schedule());
    }

    /**
     * Admin/manager/team_lead: paginated list of users with their schedules.
     * Team leads only see their own team members.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Schedule::class);

        $caller = $request->user();

        $query = User::with(['schedule', 'roles'])->orderBy('first_name')->orderBy('last_name');

        // Admins must not see super_admin users
        if (! $caller->hasRole('super_admin')) {
            $query->whereDoesntHave('roles', fn ($q) => $q->where('slug', 'super_admin'));
        }

        // Team leads are scoped to members of their led teams
        if (
            ! $caller->hasAnyRole(['super_admin', 'admin', 'manager']) &&
            $caller->hasRole('team_lead')
        ) {
            $memberIds = $caller->ledTeams()
                ->with('members:id')
                ->get()
                ->flatMap(fn ($t) => $t->members->pluck('id'))
                ->unique()
                ->values();

            $query->whereIn('id', $memberIds);
        }

        return UserResource::collection($query->paginate(20));
    }

    /** Admin/manager/team_lead: assign or update a user's schedule. */
    /** Admin/manager/team_lead: assign or update a user's schedule. */
    public function upsert(StoreScheduleRequest $request, User $user): ScheduleResource
    {
        $schedule = Schedule::firstOrNew(['user_id' => $user->id]);

        // Gate check: 'create' for new schedules, 'update' for existing ones.
        if ($schedule->exists) {
            $this->authorize('update', $schedule);
        } else {
            $this->authorize('create', Schedule::class);
        }

        // 1. Grab validated data EXCEPT the 'is_overnight' flag
        $scheduleData = $request->safe()->except(['is_overnight']);

        // 2. Merge with user_id and save
        $schedule->fill(array_merge($scheduleData, ['user_id' => $user->id]));
        $schedule->save();

        return new ScheduleResource($schedule);
    }
}
 