<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTeamRequest;
use App\Http\Requests\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeamController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Team::class);

        $query = Team::with(['leader:id,first_name,middle_name,last_name,email', 'manager:id,first_name,middle_name,last_name,email', 'members:id,first_name,middle_name,last_name,email'])
            ->orderBy('name');

        // Team leads only see teams they lead.
        $user = $request->user();
        if ($user->hasRole('team_lead') && !$user->hasAnyRole(['super_admin', 'admin', 'manager'])) {
            $query->where('leader_id', $user->id);
        }

        return TeamResource::collection($query->paginate(20));
    }

    public function store(StoreTeamRequest $request): TeamResource
    {
        $this->authorize('create', Team::class);

        $team = Team::create($request->safe()->only(['name', 'description', 'leader_id', 'manager_id']));

        if ($request->filled('member_ids')) {
            $team->members()->sync($request->member_ids);
        }

        $team->load(['leader:id,first_name,middle_name,last_name,email', 'manager:id,first_name,middle_name,last_name,email', 'members:id,first_name,middle_name,last_name,email']);

        return new TeamResource($team);
    }

    public function show(Team $team): TeamResource
    {
        $this->authorize('view', $team);

        $team->load(['leader:id,first_name,middle_name,last_name,email', 'manager:id,first_name,middle_name,last_name,email', 'members:id,first_name,middle_name,last_name,email']);

        return new TeamResource($team);
    }

    public function update(UpdateTeamRequest $request, Team $team): TeamResource
    {
        $this->authorize('update', $team);

        $team->update($request->safe()->only(['name', 'description', 'leader_id', 'manager_id']));

        if ($request->has('member_ids')) {
            $team->members()->sync($request->member_ids);
        }

        $team->load(['leader:id,first_name,middle_name,last_name,email', 'manager:id,first_name,middle_name,last_name,email', 'members:id,first_name,middle_name,last_name,email']);

        return new TeamResource($team);
    }

    public function destroy(Team $team): JsonResponse
    {
        $this->authorize('delete', $team);

        $team->delete();

        return response()->json(null, 204);
    }
}
