<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingEntryRequest;
use App\Http\Resources\TrainingEntryResource;
use App\Models\TrainingEntry;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class TrainingEntryController extends Controller
{
    /**
     * Create or update the training entry for a specific employee on a specific date.
     *
     * PUT /api/training-entries/{user}
     */
    public function upsert(StoreTrainingEntryRequest $request, User $user): JsonResponse
    {
        $this->authorize('create', [TrainingEntry::class, $user]);

        $validated = $request->validated();

        $existing = TrainingEntry::where('user_id', $user->id)
            ->where('date', $validated['date'])
            ->first();

        if ($existing) {
            $existing->update([
                'hours'       => $validated['hours'],
                'description' => $validated['description'],
            ]);

            return (new TrainingEntryResource($existing))
                ->response()
                ->setStatusCode(200);
        }

        $entry = TrainingEntry::create([
            'user_id'     => $user->id,
            'date'        => $validated['date'],
            'hours'       => $validated['hours'],
            'description' => $validated['description'],
            'created_by'  => auth()->id(),
        ]);

        return (new TrainingEntryResource($entry))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Remove a training entry.
     *
     * DELETE /api/training-entries/{entry}
     */
    public function destroy(TrainingEntry $entry): JsonResponse
    {
        $this->authorize('delete', $entry);

        $entry->delete();

        return response()->json(null, 204);
    }
}
