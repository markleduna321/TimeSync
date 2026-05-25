<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewLeaveApplicationRequest;
use App\Http\Requests\StoreLeaveApplicationRequest;
use App\Http\Resources\LeaveApplicationResource;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\LeaveCredit;
use App\Models\LeaveCreditTransaction;
use App\Models\LeaveType;
use App\Models\Team;
use App\Models\User;
use App\Notifications\LeaveFiledNotification;
use App\Notifications\LeaveReviewedNotification;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class LeaveApplicationController extends Controller
{
    /**
     * GET /api/leave/applications
     * List with tiered visibility (mirrors AttendanceCorrectionController scoping).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $caller = $request->user();
        $status = $request->query('status');
        $month  = $request->query('month'); // YYYY-MM

        $query = LeaveApplication::with(['user', 'reviewer', 'leaveType'])
            ->orderByDesc('created_at');

        if ($caller->hasAnyRole(['super_admin', 'admin'])) {
            // No scoping.
        } elseif ($caller->hasRole('manager')) {
            $managedTeamIds    = Team::where('manager_id', $caller->id)->pluck('id');
            $teamMemberIds     = \DB::table('team_user')
                ->whereIn('team_id', $managedTeamIds)
                ->pluck('user_id')
                ->unique();

            $query->where(function ($q) use ($caller, $teamMemberIds) {
                $q->where('user_id', $caller->id)
                  ->orWhereIn('user_id', $teamMemberIds);
            });
        } elseif ($caller->hasRole('team_lead')) {
            $ledTeamIds    = Team::where('leader_id', $caller->id)->pluck('id');
            $memberIds     = \DB::table('team_user')
                ->whereIn('team_id', $ledTeamIds)
                ->where('user_id', '!=', $caller->id)
                ->pluck('user_id')
                ->unique();

            $query->where(function ($q) use ($caller, $memberIds) {
                $q->where('user_id', $caller->id)
                  ->orWhereIn('user_id', $memberIds);
            });
        } else {
            $query->where('user_id', $caller->id);
        }

        if ($status && in_array($status, ['pending', 'approved', 'rejected', 'cancelled'])) {
            $query->where('status', $status);
        }

        if ($month) {
            try {
                $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
                $end   = Carbon::createFromFormat('Y-m', $month)->endOfMonth()->toDateString();
                $query->where(function ($q) use ($start, $end) {
                    $q->whereBetween('start_date', [$start, $end])
                      ->orWhereBetween('end_date', [$start, $end]);
                });
            } catch (\Exception) {
                // ignore invalid month
            }
        }

        return LeaveApplicationResource::collection($query->paginate(20));
    }

    /**
     * POST /api/leave/applications
     * File a new leave application.
     */
    public function store(StoreLeaveApplicationRequest $request): LeaveApplicationResource
    {
        $this->authorize('create', LeaveApplication::class);

        $filer     = $request->user();
        $leaveType = LeaveType::findOrFail($request->leave_type_id);
        $startDate = Carbon::parse($request->start_date);
        $endDate   = Carbon::parse($request->end_date);
        $isHalfDay = (bool) $request->input('half_day', false);

        // Compute working days (excludes weekends + holidays)
        $daysRequested = $isHalfDay ? 0.5 : $this->computeWorkingDays($filer, $startDate, $endDate);

        // Check credit balance
        $year   = $startDate->year;
        $credit = LeaveCredit::firstOrCreate(
            ['user_id' => $filer->id, 'leave_type_id' => $leaveType->id, 'year' => $year],
            ['total_credits' => 0, 'used_credits' => 0, 'carried_over' => 0]
        );

        if ($credit->balance < $daysRequested) {
            return response()->json([
                'message' => 'Insufficient leave credits.',
                'errors'  => [
                    'leave_type_id' => [
                        "You only have {$credit->balance} {$leaveType->name} credit(s) remaining."
                    ],
                ],
            ], 422);
        }

        $proofPath = $request->hasFile('proof')
            ? $request->file('proof')->store('leave-proofs', 'local')
            : null;

        DB::transaction(function () use (
            $filer, $leaveType, $request, $startDate, $endDate,
            $daysRequested, $isHalfDay, $year, $credit, $proofPath
        ) {
            $application = LeaveApplication::create([
                'user_id'         => $filer->id,
                'leave_type_id'   => $leaveType->id,
                'start_date'      => $startDate->toDateString(),
                'end_date'        => $endDate->toDateString(),
                'days_requested'  => $daysRequested,
                'half_day'        => $isHalfDay,
                'half_day_period' => $isHalfDay ? $request->half_day_period : null,
                'reason'          => $request->reason,
                'proof_path'      => $proofPath,
                'status'          => 'pending',
            ]);

            // Debit credits optimistically (reversed on rejection)
            $credit->increment('used_credits', $daysRequested);

            LeaveCreditTransaction::create([
                'user_id'        => $filer->id,
                'leave_type_id'  => $leaveType->id,
                'type'           => 'debit',
                'amount'         => $daysRequested,
                'reference_type' => 'LeaveApplication',
                'reference_id'   => $application->id,
                'note'           => "Leave filed: {$startDate->format('M d')} – {$endDate->format('M d, Y')}",
                'created_by'     => $filer->id,
            ]);

            // Notify reviewers
            $reviewers = $this->getReviewers($filer);
            Notification::send(
                $reviewers,
                new LeaveFiledNotification($application->load('leaveType'), $filer->name)
            );
        });

        $application = LeaveApplication::with(['user', 'reviewer', 'leaveType'])
            ->where('user_id', $filer->id)
            ->where('start_date', $startDate->toDateString())
            ->where('leave_type_id', $leaveType->id)
            ->latest()
            ->firstOrFail();

        return new LeaveApplicationResource($application);
    }

    /**
     * GET /api/leave/applications/{id}
     */
    public function show(LeaveApplication $application): LeaveApplicationResource
    {
        $this->authorize('view', $application);

        return new LeaveApplicationResource(
            $application->load(['user', 'reviewer', 'leaveType'])
        );
    }

    /**
     * PATCH /api/leave/applications/{id}/review
     */
    public function review(ReviewLeaveApplicationRequest $request, LeaveApplication $application): LeaveApplicationResource
    {
        $this->authorize('review', $application);

        if ($application->status !== 'pending') {
            return response()->json(['message' => 'This application has already been reviewed.'], 422);
        }

        $action = $request->action; // 'approved' | 'rejected'

        DB::transaction(function () use ($application, $action, $request) {
            $application->update([
                'status'      => $action,
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
                'admin_note'  => $request->admin_note,
            ]);

            // On rejection — reverse the credit deduction
            if ($action === 'rejected') {
                LeaveCredit::where('user_id', $application->user_id)
                    ->where('leave_type_id', $application->leave_type_id)
                    ->where('year', $application->start_date->year)
                    ->decrement('used_credits', $application->days_requested);

                LeaveCreditTransaction::create([
                    'user_id'        => $application->user_id,
                    'leave_type_id'  => $application->leave_type_id,
                    'type'           => 'credit',
                    'amount'         => $application->days_requested,
                    'reference_type' => 'LeaveApplication',
                    'reference_id'   => $application->id,
                    'note'           => 'Credits restored — leave rejected',
                    'created_by'     => auth()->id(),
                ]);
            }
        });

        // Notify the filer
        $application->user->notify(
            new LeaveReviewedNotification(
                $application->fresh()->load(['leaveType']),
                auth()->user()->name
            )
        );

        return new LeaveApplicationResource(
            $application->fresh()->load(['user', 'reviewer', 'leaveType'])
        );
    }

    /**
     * DELETE /api/leave/applications/{id}
     * Employee cancels their own pending application.
     */
    public function cancel(LeaveApplication $application): JsonResponse
    {
        $this->authorize('delete', $application);

        DB::transaction(function () use ($application) {
            $application->update(['status' => 'cancelled']);

            // Restore credits
            LeaveCredit::where('user_id', $application->user_id)
                ->where('leave_type_id', $application->leave_type_id)
                ->where('year', $application->start_date->year)
                ->decrement('used_credits', $application->days_requested);

            LeaveCreditTransaction::create([
                'user_id'        => $application->user_id,
                'leave_type_id'  => $application->leave_type_id,
                'type'           => 'credit',
                'amount'         => $application->days_requested,
                'reference_type' => 'LeaveApplication',
                'reference_id'   => $application->id,
                'note'           => 'Credits restored — leave cancelled by employee',
                'created_by'     => $application->user_id,
            ]);
        });

        return response()->json(['message' => 'Leave application cancelled.']);
    }

    /* ── Helpers ─────────────────────────────────────────── */

    /**
     * Count working days between two dates, excluding:
     * - days NOT in the user's schedule work_days
     * - holidays in the Holiday table
     */
    private function computeWorkingDays(User $filer, Carbon $start, Carbon $end): float
    {
        $filer->loadMissing('schedule');
        $workDays = $filer->schedule?->work_days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

        // Normalize to Carbon format (e.g. 'monday')
        $normalizedWorkDays = array_map('strtolower', $workDays);

        // Load holidays in the range
        $holidayDates = Holiday::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $count = 0;
        $period = CarbonPeriod::create($start, $end);

        foreach ($period as $day) {
            $dayName = strtolower($day->englishDayOfWeek);
            // Also support 3-letter format stored in schedules
            $dayShort = $day->format('D'); // 'Mon'

            $isWorkDay = in_array($dayName, $normalizedWorkDays)
                      || in_array($dayShort, $workDays);

            if (! $isWorkDay) continue;
            if (in_array($day->toDateString(), $holidayDates)) continue;

            $count++;
        }

        return (float) $count;
    }

    /**
     * Resolve reviewers for a given filer (same logic as AttendanceCorrectionController).
     */
    private function getReviewers(User $filer): \Illuminate\Support\Collection
    {
        $adminIds = User::whereHas('roles', fn ($q) => $q->whereIn('slug', ['super_admin', 'admin']))
            ->pluck('id');

        $teamIds = $filer->teams()->pluck('teams.id');

        $managerIds = Team::whereIn('id', $teamIds)
            ->whereNotNull('manager_id')
            ->pluck('manager_id');

        $leaderIds = Team::whereIn('id', $teamIds)
            ->whereNotNull('leader_id')
            ->where('leader_id', '!=', $filer->id)
            ->pluck('leader_id');

        $ids = $adminIds->merge($managerIds)->merge($leaderIds)->unique()->diff([$filer->id]);

        return User::whereIn('id', $ids)->get();
    }
}
