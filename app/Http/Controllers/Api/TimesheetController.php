<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TimeLogResource;
use App\Http\Resources\UserResource;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TimesheetController extends Controller
{
    /**
     * Return compact list of employees whose timesheets the caller may view.
     * Used to populate the "View as" employee dropdown for managers+.
     */
    public function subjects(Request $request): AnonymousResourceCollection
    {
        $caller = $request->user();

        if ($caller->hasAnyRole(['super_admin', 'admin', 'manager'])) {
            $query = User::select('id', 'first_name', 'middle_name', 'last_name', 'email')
                ->orderBy('first_name')->orderBy('last_name');

            // Admins must not see super_admin users
            if (! $caller->hasRole('super_admin')) {
                $query->whereDoesntHave('roles', fn ($q) => $q->where('slug', 'super_admin'));
            }

            $users = $query->get();
        } elseif ($caller->hasRole('team_lead')) {
            $memberIds = $caller->ledTeams()
                ->with('members:id')
                ->get()
                ->flatMap(fn ($t) => $t->members->pluck('id'))
                ->unique()
                ->values();

            $users = User::select('id', 'first_name', 'middle_name', 'last_name', 'email')
                ->whereIn('id', $memberIds)
                ->orderBy('first_name')->orderBy('last_name')
                ->get();
        } else {
            $users = collect();
        }

        return UserResource::collection($users);
    }

    /**
     * Return all time logs for a given month for the target user.
     * Employees always see their own data; managers/team leads may view others.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $targetId = (int) $request->query('user_id', auth()->id());
        $target   = User::findOrFail($targetId);

        $this->authorize('viewTimesheet', $target);

        $month = $request->query('month', now()->format('Y-m'));

        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
            $end   = Carbon::createFromFormat('Y-m', $month)->endOfMonth()->toDateString();
        } catch (\Exception) {
            $start = now()->startOfMonth()->toDateString();
            $end   = now()->endOfMonth()->toDateString();
        }

        $logs = TimeLog::where('user_id', $target->id)
            ->whereBetween('date', [$start, $end])
            ->orderBy('date')
            ->get();

        return TimeLogResource::collection($logs);
    }
}
