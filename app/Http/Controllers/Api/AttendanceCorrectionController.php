<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewAttendanceCorrectionRequest;
use App\Http\Requests\StoreAttendanceCorrectionRequest;
use App\Http\Resources\AttendanceCorrectionResource;
use App\Models\AttendanceCorrection;
use App\Models\OvertimeRecord;
use App\Models\Team;
use App\Models\TimeLog;
use App\Models\TimeLogHistory;
use App\Models\User;
use App\Notifications\CorrectionFiledNotification;
use App\Notifications\CorrectionReviewedNotification;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class AttendanceCorrectionController extends Controller
{
    /**
     * List corrections with tiered visibility.
     *
     * - super_admin / admin : all corrections.
     * - manager             : own + corrections filed by team_leads in their managed teams.
     * - team_lead           : own + corrections filed by non-lead members of their led teams.
     * - employee            : own only.
     *
     * GET /api/attendance/corrections?status=pending&page=1
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', AttendanceCorrection::class);

        $caller = $request->user();
        $status = $request->query('status');

        $query = AttendanceCorrection::with(['user', 'reviewer', 'history.changedBy'])
            ->orderByDesc('created_at');

        if ($caller->hasAnyRole(['super_admin', 'admin'])) {
            // No scoping — see everything.
        } elseif ($caller->hasRole('manager')) {
            // See own + team_leads in managed teams.
            $managedTeamIds = Team::where('manager_id', $caller->id)->pluck('id');
            $teamLeadMemberIds = \DB::table('team_user')
                ->join('role_user', 'team_user.user_id', '=', 'role_user.user_id')
                ->join('roles', 'role_user.role_id', '=', 'roles.id')
                ->whereIn('team_user.team_id', $managedTeamIds)
                ->where('roles.slug', 'team_lead')
                ->pluck('team_user.user_id')
                ->unique();

            $query->where(function ($q) use ($caller, $teamLeadMemberIds) {
                $q->where('user_id', $caller->id)
                  ->orWhereIn('user_id', $teamLeadMemberIds);
            });
        } elseif ($caller->hasRole('team_lead')) {
            // See own + non-lead members of led teams.
            $ledTeamIds = Team::where('leader_id', $caller->id)->pluck('id');
            $regularMemberIds = \DB::table('team_user')
                ->join('users', 'team_user.user_id', '=', 'users.id')
                ->whereIn('team_user.team_id', $ledTeamIds)
                ->whereNotIn('team_user.user_id', function ($sub) {
                    $sub->select('user_id')->from('role_user')
                        ->join('roles', 'role_user.role_id', '=', 'roles.id')
                        ->where('roles.slug', 'team_lead');
                })
                ->where('team_user.user_id', '!=', $caller->id)
                ->pluck('team_user.user_id')
                ->unique();

            $query->where(function ($q) use ($caller, $regularMemberIds) {
                $q->where('user_id', $caller->id)
                  ->orWhereIn('user_id', $regularMemberIds);
            });
        } else {
            // Employee: own only.
            $query->where('user_id', $caller->id);
        }

        if ($status && in_array($status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $status);
        }

        return AttendanceCorrectionResource::collection($query->paginate(20));
    }

    /**
     * File a new correction request (with proof upload).
     *
     * POST /api/attendance/corrections
     */
    public function store(StoreAttendanceCorrectionRequest $request): AttendanceCorrectionResource
    {
        $this->authorize('create', AttendanceCorrection::class);

        $proofPath = $request->hasFile('proof')
            ? $request->file('proof')->store('corrections', 'local')
            : null;

        $correction = AttendanceCorrection::create([
            'user_id'              => auth()->id(),
            'date'                 => $request->date,
            'type'                 => $request->input('type', 'correction'),
            'reason'               => $request->reason,
            'proof_path'           => $proofPath,
            'requested_clock_in'   => $request->requested_clock_in,
            'requested_clock_out'  => $request->requested_clock_out,
            'status'               => 'pending',
        ]);

        // Notify all potential reviewers for this user.
        $filer     = $correction->load('user')->user;
        $reviewers = $this->getReviewers($filer);
        Notification::send($reviewers, new CorrectionFiledNotification($correction, $filer->name));

        return new AttendanceCorrectionResource($correction->load(['user', 'reviewer']));
    }

    /**
     * Approve or reject a correction.
     *
     * PATCH /api/attendance/corrections/{correction}
     */
    public function review(ReviewAttendanceCorrectionRequest $request, AttendanceCorrection $correction): AttendanceCorrectionResource
    {
        // Load user relation so the policy can check team membership.
        $correction->loadMissing('user.roles');

        $this->authorize('review', $correction);

        if ($correction->status !== 'pending') {
            abort(422, 'This correction has already been reviewed.');
        }

        $correction->update([
            'status'                => $request->action,
            'reviewed_by'           => auth()->id(),
            'reviewed_at'           => now(),
            'admin_note'            => $request->admin_note,
            'effective_shift_start' => $request->effective_shift_start ?: null,
            'effective_shift_end'   => $request->effective_shift_end   ?: null,
        ]);

        if ($request->action === 'approved') {
            if ($correction->type === 'correction') {
                $dateStr     = $correction->date->format('Y-m-d');
                $localTz     = env('APP_LOCAL_TIMEZONE', 'Asia/Manila');
                $existingLog = TimeLog::where('user_id', $correction->user_id)
                    ->where('date', $dateStr)->first();

                $newClockIn  = $correction->requested_clock_in
                    ? Carbon::parse($dateStr . ' ' . $correction->requested_clock_in, $localTz)
                    : $existingLog?->clock_in;

                // Detect overnight: clock_out time string is earlier than clock_in time string
                $clockOutDateStr = ($correction->requested_clock_out && $correction->requested_clock_in
                    && $correction->requested_clock_out < $correction->requested_clock_in)
                    ? Carbon::parse($dateStr)->addDay()->format('Y-m-d')
                    : $dateStr;

                $newClockOut = $correction->requested_clock_out
                    ? Carbon::parse($clockOutDateStr . ' ' . $correction->requested_clock_out, $localTz)
                    : $existingLog?->clock_out;

                TimeLogHistory::create([
                    'user_id'       => $correction->user_id,
                    'date'          => $dateStr,
                    'time_log_id'   => $existingLog?->id,
                    'old_clock_in'  => $existingLog?->clock_in,
                    'old_clock_out' => $existingLog?->clock_out,
                    'new_clock_in'  => $newClockIn,
                    'new_clock_out' => $newClockOut,
                    'correction_id' => $correction->id,
                    'changed_by'    => auth()->id(),
                ]);

                $fields = ['status' => 'clocked_out'];
                if ($correction->requested_clock_in) {
                    $fields['clock_in'] = $newClockIn;
                }
                if ($correction->requested_clock_out) {
                    $fields['clock_out'] = $newClockOut;
                }
                // Copy any admin-set effective shift override so that late/undertime
                // is re-evaluated against the temporary schedule, not the permanent one.
                $fields['effective_shift_start'] = $correction->effective_shift_start;
                $fields['effective_shift_end']   = $correction->effective_shift_end;

                TimeLog::updateOrCreate(
                    ['user_id' => $correction->user_id, 'date' => $dateStr],
                    $fields
                );
            } elseif ($correction->type === 'overtime') {
                $dateStr = $correction->date->format('Y-m-d');
                $localTz = env('APP_LOCAL_TIMEZONE', 'Asia/Manila');
                $start   = Carbon::parse($dateStr . ' ' . $correction->requested_clock_in, $localTz);

                // Detect overnight: end time string earlier than start time string means next day
                $endDateStr = ($correction->requested_clock_out < $correction->requested_clock_in)
                    ? Carbon::parse($dateStr)->addDay()->format('Y-m-d')
                    : $dateStr;
                $end = Carbon::parse($endDateStr . ' ' . $correction->requested_clock_out, $localTz);

                OvertimeRecord::create([
                    'user_id'       => $correction->user_id,
                    'date'          => $dateStr,
                    'start_time'    => $correction->requested_clock_in,
                    'end_time'      => $correction->requested_clock_out,
                    'total_minutes' => (int) $start->diffInMinutes($end),
                    'correction_id' => $correction->id,
                    'approved_by'   => auth()->id(),
                    'approved_at'   => now(),
                ]);
            }
        }

        // Notify the original filer of the decision.
        $correction->user->notify(new CorrectionReviewedNotification($correction, auth()->user()->name));

        return new AttendanceCorrectionResource($correction->fresh()->load(['user', 'reviewer']));
    }

    /**
     * Serve the proof file via a signed, private download.
     * Registered as a named web route — not an API endpoint.
     *
     * GET /attendance/corrections/{correction}/proof
     */
    public function proof(AttendanceCorrection $correction): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $caller = auth()->user();

        // Only the owner or managers+ may download the proof
        if (
            $caller->id !== $correction->user_id &&
            ! $caller->hasAnyRole(['super_admin', 'admin', 'manager'])
        ) {
            abort(403);
        }

        abort_unless($correction->proof_path && Storage::disk('local')->exists($correction->proof_path), 404);

        return Storage::disk('local')->download($correction->proof_path);
    }

    /**
     * Resolve the set of users who may review corrections filed by $filer.
     * - super_admin and admin users always qualify.
     * - The manager of any team the filer belongs to qualifies.
     * - The team_lead of any team the filer belongs to qualifies (unless filer IS the lead).
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

