<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHolidayRequest;
use App\Http\Requests\UpdateHolidayRequest;
use App\Http\Resources\HolidayResource;
use App\Models\Holiday;
use App\Models\User;
use App\Notifications\HolidayAddedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Notification;

class HolidayController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Holiday::class);

        $year = $request->query('year', now()->year);

        $holidays = Holiday::whereYear('date', $year)
            ->orderBy('date')
            ->get();

        return HolidayResource::collection($holidays);
    }

    public function store(StoreHolidayRequest $request): HolidayResource
    {
        $this->authorize('create', Holiday::class);

        $holiday = Holiday::create($request->validated());

        // Notify all users about the new holiday.
        $allUsers = User::all();
        Notification::send($allUsers, new HolidayAddedNotification($holiday));

        return new HolidayResource($holiday);
    }

    public function update(UpdateHolidayRequest $request, Holiday $holiday): HolidayResource
    {
        $this->authorize('update', $holiday);

        $holiday->update($request->validated());

        return new HolidayResource($holiday);
    }

    public function destroy(Holiday $holiday): JsonResponse
    {
        $this->authorize('delete', $holiday);

        $holiday->delete();

        return response()->json(null, 204);
    }
}
