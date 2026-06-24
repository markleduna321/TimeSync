<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleOverrideRequest;
use App\Http\Resources\ScheduleOverrideResource;
use App\Models\ScheduleOverride;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ScheduleOverrideController extends Controller
{
    /**
     * Create or update the shift override for a specific employee on a specific date.
     *
     * PUT /api/schedule-overrides/{user}
     */
    public function upsert(StoreScheduleOverrideRequest $request, User $user): JsonResponse
    {
        $this->authorize('create', [ScheduleOverride::class, $user]);

        $validated = $request->validated();

        $existing = ScheduleOverride::where('user_id', $user->id)
            ->where('date', $validated['date'])
            ->first();

        if ($existing) {
            $existing->update([
                'shift_start'          => $validated['shift_start'],
                'shift_end'            => $validated['shift_end'],
                'promotes_to_workday'  => $validated['promotes_to_workday'] ?? false,
                'note'                 => $validated['note'] ?? null,
            ]);

            return (new ScheduleOverrideResource($existing))
                ->response()
                ->setStatusCode(200);
        }

        $override = ScheduleOverride::create([
            'user_id'              => $user->id,
            'date'                 => $validated['date'],
            'shift_start'          => $validated['shift_start'],
            'shift_end'            => $validated['shift_end'],
            'promotes_to_workday'  => $validated['promotes_to_workday'] ?? false,
            'note'                 => $validated['note'] ?? null,
            'created_by'           => auth()->id(),
        ]);

        return (new ScheduleOverrideResource($override))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Remove a shift override.
     *
     * DELETE /api/schedule-overrides/{override}
     */
    public function destroy(ScheduleOverride $override): JsonResponse
    {
        $this->authorize('delete', $override);

        $override->delete();

        return response()->json(null, 204);
    }
}
