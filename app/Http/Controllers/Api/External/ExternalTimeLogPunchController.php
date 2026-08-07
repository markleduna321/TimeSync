<?php

namespace App\Http\Controllers\Api\External;

use App\Http\Controllers\Controller;
use App\Http\Requests\External\ExternalPunchBatchRequest;
use App\Http\Requests\External\ExternalPunchRequest;
use App\Models\TimeLog;
use App\Models\TimeLogPunch;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ExternalTimeLogPunchController extends Controller
{
    /** Apply a single punch event from the desktop. */
    public function store(ExternalPunchRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (TimeLogPunch::where('device_log_id', $data['device_log_id'])->exists()) {
            return response()->json(['status' => 'ok', 'result' => 'skipped'], 200);
        }

        DB::transaction(function () use ($data) {
            TimeLogPunch::create([
                'device_log_id' => $data['device_log_id'],
                'user_id'       => $data['user_id'],
                'date'          => $data['date'],
                'punched_at'    => $data['timestamp'],
                'log_type'      => $data['log_type'],
            ]);

            $this->applyPunch($data);
        });

        return response()->json(['status' => 'ok', 'result' => 'applied'], 201);
    }

    /**
     * Apply a batch of punch events — for offline queue flushes.
     * Punches are sorted by timestamp before processing so out-of-order batches
     * are always assembled in the correct chronological sequence.
     */
    public function batch(ExternalPunchBatchRequest $request): JsonResponse
    {
        $punches = collect($request->validated()['punches'])
            ->sortBy('timestamp')
            ->values();

        $results = [];

        foreach ($punches as $data) {
            try {
                if (TimeLogPunch::where('device_log_id', $data['device_log_id'])->exists()) {
                    $results[] = $this->row($data, 'ok', 'skipped');
                    continue;
                }

                DB::transaction(function () use ($data) {
                    TimeLogPunch::create([
                        'device_log_id' => $data['device_log_id'],
                        'user_id'       => $data['user_id'],
                        'date'          => $data['date'],
                        'punched_at'    => $data['timestamp'],
                        'log_type'      => $data['log_type'],
                    ]);

                    $this->applyPunch($data);
                });

                $results[] = $this->row($data, 'ok', 'applied');
            } catch (\Throwable $e) {
                $results[] = $this->row($data, 'error', null, $e->getMessage());
            }
        }

        $failed = collect($results)->where('status', 'error')->count();

        return response()->json([
            'applied' => collect($results)->where('result', 'applied')->count(),
            'skipped' => collect($results)->where('result', 'skipped')->count(),
            'failed'  => $failed,
            'results' => $results,
        ]);
    }

    private function applyPunch(array $data): void
    {
        $log = TimeLog::firstOrCreate(
            ['user_id' => $data['user_id'], 'date' => $data['date']],
            ['status' => 'active']
        );

        $ts = $data['timestamp'];

        switch ($data['log_type']) {
            case 'clock_in':
                $log->clock_in = $ts;
                $log->status   = 'active';
                break;

            case 'clock_out':
                $log->clock_out = $ts;
                $log->status    = 'clocked_out';
                break;

            case 'break_out':
                if (is_null($log->lunch_start)) {
                    $log->lunch_start = $ts;
                    $log->status      = 'on_lunch';
                } else {
                    $breaks   = $log->breaks ?? [];
                    $breaks[] = ['start' => $ts, 'end' => null];
                    $log->breaks = $breaks;
                    $log->status = 'on_break';
                }
                break;

            case 'break_in':
                if (! is_null($log->lunch_start) && is_null($log->lunch_end)) {
                    $log->lunch_end = $ts;
                    $log->status    = 'active';
                } else {
                    $breaks = $log->breaks ?? [];
                    // Close the last open break entry
                    foreach (array_reverse(array_keys($breaks)) as $i) {
                        if (empty($breaks[$i]['end'])) {
                            $breaks[$i]['end'] = $ts;
                            break;
                        }
                    }
                    $log->breaks = $breaks;
                    $log->status = 'active';
                }
                break;
        }

        $log->save();
    }

    private function row(array $data, string $status, ?string $result, ?string $message = null): array
    {
        return array_filter([
            'device_log_id' => $data['device_log_id'],
            'user_id'       => $data['user_id'],
            'date'          => $data['date'],
            'log_type'      => $data['log_type'],
            'status'        => $status,
            'result'        => $result,
            'message'       => $message,
        ], fn ($v) => $v !== null);
    }
}
