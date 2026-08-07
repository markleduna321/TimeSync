<?php

namespace App\Http\Controllers\Api\External;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExternalUserResource;
use App\Models\ScheduleOverride;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExternalUserController extends Controller
{
    /** Paginated user list with schedule — for local DB sync on the desktop. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $users = User::with(['schedule', 'roles'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(100);

        return ExternalUserResource::collection($users);
    }

    /** Single user with schedule + upcoming 30-day overrides. */
    public function show(User $user): ExternalUserResource
    {
        $user->loadMissing(['schedule', 'roles']);

        $overrides = ScheduleOverride::where('user_id', $user->id)
            ->where('date', '>=', now()->toDateString())
            ->where('date', '<=', now()->addDays(30)->toDateString())
            ->orderBy('date')
            ->get()
            ->map(fn ($o) => [
                'date'                => $o->date->format('Y-m-d'),
                'promotes_to_workday' => (bool) $o->promotes_to_workday,
                'demotes_to_restday'  => (bool) $o->demotes_to_restday,
                'shift_start'         => $o->shift_start ? substr($o->shift_start, 0, 5) : null,
                'shift_end'           => $o->shift_end   ? substr($o->shift_end,   0, 5) : null,
                'note'                => $o->note,
            ])
            ->values()
            ->all();

        $user->setRelation('scheduleOverrides', collect($overrides));

        return new ExternalUserResource($user);
    }
}
