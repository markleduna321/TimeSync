<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClockActionRequest;
use App\Http\Resources\TimeLogResource;
use App\Models\TimeLog;
use App\Models\UserBreakConfig;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TimeLogController extends Controller
{
    private function todayLog(): ?TimeLog
    {
        return TimeLog::where('user_id', auth()->id())
            ->where('date', today())
            ->first();
    }

    public function today(Request $request): TimeLogResource
    {
        $log = $this->todayLog();
        return new TimeLogResource($log ?? new TimeLog());
    }

    public function clockIn(ClockActionRequest $request): TimeLogResource|JsonResponse
    {
        if (! auth()->user()->hasRole('employee')) {
            return response()->json(['message' => 'Only employees can clock in.'], 403);
        }

        if ($this->todayLog()) {
            return response()->json(['message' => 'Already clocked in today.'], 409);
        }

        $log = TimeLog::create([
            'user_id'  => auth()->id(),
            'date'     => today(),
            'clock_in' => now(),
            'status'   => 'active',
        ]);

        return new TimeLogResource($log);
    }

    public function clockOut(ClockActionRequest $request): TimeLogResource|JsonResponse
    {
        $log = $this->todayLog();

        if (! $log || $log->status !== 'active') {
            return response()->json(['message' => 'No active clock-in found for today.'], 422);
        }

        $log->update(['clock_out' => now(), 'status' => 'clocked_out']);
        return new TimeLogResource($log->fresh());
    }

    public function lunchStart(ClockActionRequest $request): TimeLogResource|JsonResponse
    {
        $log = $this->todayLog();

        if (! $log || $log->status !== 'active') {
            return response()->json(['message' => 'Must be clocked in to start lunch.'], 422);
        }

        if ($log->lunch_start) {
            return response()->json(['message' => 'Lunch already started today.'], 409);
        }

        $log->update(['lunch_start' => now(), 'status' => 'on_lunch']);
        return new TimeLogResource($log->fresh());
    }

    public function lunchEnd(ClockActionRequest $request): TimeLogResource|JsonResponse
    {
        $log = $this->todayLog();

        if (! $log || $log->status !== 'on_lunch') {
            return response()->json(['message' => 'Not currently on lunch.'], 422);
        }

        $log->update(['lunch_end' => now(), 'status' => 'active']);
        return new TimeLogResource($log->fresh());
    }

    public function breakStart(ClockActionRequest $request): TimeLogResource|JsonResponse
    {
        $log = $this->todayLog();

        if (! $log || $log->status !== 'active') {
            return response()->json(['message' => 'Must be clocked in to start a break.'], 422);
        }

        $config = UserBreakConfig::where('user_id', auth()->id())->first();

        if (! $config || ! $config->break_allowed) {
            return response()->json(['message' => 'Breaks are not enabled for your account.'], 403);
        }

        $breaks = $log->breaks ?? [];
        $completedBreaks = count(array_filter($breaks, fn($b) => ! empty($b['end'])));

        if ($completedBreaks >= $config->break_count) {
            return response()->json(['message' => 'Maximum break count reached for today.'], 422);
        }

        $breaks[] = ['start' => now()->toISOString(), 'end' => null];
        $log->update(['breaks' => $breaks, 'status' => 'on_break']);

        return new TimeLogResource($log->fresh());
    }

    public function breakEnd(ClockActionRequest $request): TimeLogResource|JsonResponse
    {
        $log = $this->todayLog();

        if (! $log || $log->status !== 'on_break') {
            return response()->json(['message' => 'Not currently on a break.'], 422);
        }

        $breaks = $log->breaks ?? [];
        $lastIndex = count($breaks) - 1;

        if ($lastIndex < 0 || ! empty($breaks[$lastIndex]['end'])) {
            return response()->json(['message' => 'No open break found.'], 422);
        }

        $breaks[$lastIndex]['end'] = now()->toISOString();
        $log->update(['breaks' => $breaks, 'status' => 'active']);

        return new TimeLogResource($log->fresh());
    }

    /**
     * Employee: paginated time-log history for a given month.
     * Only returns the authenticated user's own records.
     */
    public function history(Request $request): AnonymousResourceCollection
    {
        $month = $request->query('month', now()->format('Y-m'));

        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
            $end   = Carbon::createFromFormat('Y-m', $month)->endOfMonth()->toDateString();
        } catch (\Exception) {
            $start = now()->startOfMonth()->toDateString();
            $end   = now()->endOfMonth()->toDateString();
        }

        $logs = TimeLog::where('user_id', auth()->id())
            ->whereBetween('date', [$start, $end])
            ->orderByDesc('date')
            ->paginate(31);

        return TimeLogResource::collection($logs);
    }
}
