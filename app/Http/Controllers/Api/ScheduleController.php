<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleRequest;
use App\Http\Resources\ScheduleResource;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ScheduleController extends Controller
{
    public function mySchedule(Request $request): ScheduleResource
    {
        $schedule = Schedule::where('user_id', auth()->id())->first();
        return new ScheduleResource($schedule ?? new Schedule());
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Schedule::class);

        $schedules = Schedule::with('user:id,name,email')->get();
        return ScheduleResource::collection($schedules);
    }

    public function upsert(StoreScheduleRequest $request, User $user): ScheduleResource
    {
        $schedule = Schedule::firstOrNew(['user_id' => $user->id]);
        $this->authorize('update', $schedule->exists ? $schedule : Schedule::class);

        $schedule->fill(array_merge($request->validated(), ['user_id' => $user->id]));
        $schedule->save();

        return new ScheduleResource($schedule);
    }
}
