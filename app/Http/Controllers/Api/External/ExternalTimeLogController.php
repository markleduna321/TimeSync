<?php

namespace App\Http\Controllers\Api\External;

use App\Http\Controllers\Controller;
use App\Http\Requests\External\ExternalTimeLogBatchRequest;
use App\Http\Requests\External\ExternalTimeLogRequest;
use App\Http\Resources\TimeLogResource;
use App\Models\TimeLog;
use Illuminate\Http\JsonResponse;

class ExternalTimeLogController extends Controller
{
    /** Push a single time log entry. Idempotent via device_log_id. */
    public function store(ExternalTimeLogRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['device_log_id'])) {
            $existing = TimeLog::where('device_log_id', $data['device_log_id'])->first();
            if ($existing) {
                return (new TimeLogResource($existing))->response()->setStatusCode(200);
            }
        }

        $log    = TimeLog::firstOrCreate(
            ['user_id' => $data['user_id'], 'date' => $data['date']],
            ['status' => 'active']
        );
        $wasNew = $log->wasRecentlyCreated;

        $this->merge($log, $data);
        $log->save();

        return (new TimeLogResource($log))->response()->setStatusCode($wasNew ? 201 : 200);
    }

    /**
     * Batch push — accepts up to 200 entries; returns a per-entry result map.
     * Use this to flush the desktop's offline queue when connectivity is restored.
     */
    public function batch(ExternalTimeLogBatchRequest $request): JsonResponse
    {
        $results = [];

        foreach ($request->validated()['logs'] as $data) {
            try {
                if (! empty($data['device_log_id'])) {
                    $existing = TimeLog::where('device_log_id', $data['device_log_id'])->first();
                    if ($existing) {
                        $results[] = $this->resultRow($data, 'ok', $existing->id);
                        continue;
                    }
                }

                $log = TimeLog::firstOrCreate(
                    ['user_id' => $data['user_id'], 'date' => $data['date']],
                    ['status' => 'active']
                );

                $this->merge($log, $data);
                $log->save();

                $results[] = $this->resultRow($data, 'ok', $log->id);
            } catch (\Throwable $e) {
                $results[] = $this->resultRow($data, 'error', null, $e->getMessage());
            }
        }

        $failed = collect($results)->where('status', 'error')->count();

        return response()->json([
            'accepted' => count($results) - $failed,
            'failed'   => $failed,
            'results'  => $results,
        ]);
    }

    /** Only overwrite fields that are explicitly non-null in the payload; never clear existing data. */
    private function merge(TimeLog $log, array $data): void
    {
        if (! empty($data['device_log_id'])) $log->device_log_id = $data['device_log_id'];
        if (! empty($data['clock_in']))      $log->clock_in      = $data['clock_in'];
        if (! empty($data['clock_out']))     $log->clock_out     = $data['clock_out'];
        if (! empty($data['lunch_start']))   $log->lunch_start   = $data['lunch_start'];
        if (! empty($data['lunch_end']))     $log->lunch_end     = $data['lunch_end'];
        if (isset($data['breaks']))          $log->breaks        = $data['breaks'] ?? [];

        $log->status = $this->resolveStatus($log);
    }

    private function resolveStatus(TimeLog $log): string
    {
        if ($log->clock_out) return 'clocked_out';

        $breaks    = $log->breaks ?? [];
        $lastBreak = ! empty($breaks) ? end($breaks) : null;
        if ($lastBreak && ! empty($lastBreak['start']) && empty($lastBreak['end'])) {
            return 'on_break';
        }

        if ($log->lunch_start && ! $log->lunch_end) return 'on_lunch';

        return 'active';
    }

    private function resultRow(array $data, string $status, ?int $id, ?string $message = null): array
    {
        return array_filter([
            'device_log_id' => $data['device_log_id'] ?? null,
            'user_id'       => $data['user_id'],
            'date'          => $data['date'],
            'id'            => $id,
            'status'        => $status,
            'message'       => $message,
        ], fn ($v) => $v !== null);
    }
}
