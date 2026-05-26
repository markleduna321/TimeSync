<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProcessLeaveMonetizationRequest;
use App\Http\Requests\RunLeaveMonetizationRequest;
use App\Http\Resources\LeaveMonetizationResource;
use App\Models\LeaveMonetization;
use App\Services\LeaveMonetizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LeaveMonetizationController extends Controller
{
    public function __construct(
        private LeaveMonetizationService $service,
    ) {}

    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->hasAnyRole(['super_admin', 'admin']),
            403,
            'Unauthorized.'
        );
    }

    /**
     * GET /api/admin/leave-monetizations
     * Paginated list with optional year / status / user_id filters.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorizeAdmin($request);

        $query = LeaveMonetization::with(['user', 'leaveType', 'processedBy'])
            ->orderByDesc('year')
            ->orderBy('created_at');

        if ($request->filled('year')) {
            $query->where('year', (int) $request->query('year'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->query('user_id'));
        }

        return LeaveMonetizationResource::collection($query->paginate(50));
    }

    /**
     * POST /api/admin/leave-monetizations/run
     * Trigger year-end monetization for the given year.
     */
    public function run(RunLeaveMonetizationRequest $request): JsonResponse
    {
        $year  = (int) $request->validated('year');
        $force = (bool) $request->validated('force', false);

        if ($year >= now()->year && ! $force) {
            return response()->json([
                'message' => "Cannot monetize the current or a future year without force=true.",
            ], 422);
        }

        $result = $this->service->run($year, $request->user()->id, $force);

        return response()->json([
            'message' => "Monetization complete for {$year}.",
            'created' => $result['created'],
            'skipped' => $result['skipped'],
            'errors'  => $result['errors'],
        ]);
    }

    /**
     * PATCH /api/admin/leave-monetizations/{monetization}
     * Mark a single record as processed.
     */
    public function process(ProcessLeaveMonetizationRequest $request, LeaveMonetization $monetization): LeaveMonetizationResource
    {
        $this->authorizeAdmin($request);

        if ($monetization->status === 'processed') {
            return new LeaveMonetizationResource($monetization->load(['user', 'leaveType', 'processedBy']));
        }

        $monetization->update([
            'status'       => 'processed',
            'notes'        => $request->validated('notes'),
            'processed_at' => now(),
            'processed_by' => $request->user()->id,
        ]);

        return new LeaveMonetizationResource($monetization->fresh()->load(['user', 'leaveType', 'processedBy']));
    }

    /**
     * PATCH /api/admin/leave-monetizations/bulk-process
     * Mark all pending records for a given year as processed.
     */
    public function bulkProcess(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate(['year' => 'required|integer']);

        $year = (int) $request->input('year');

        $count = LeaveMonetization::where('year', $year)
            ->where('status', 'pending')
            ->update([
                'status'       => 'processed',
                'processed_at' => now(),
                'processed_by' => $request->user()->id,
            ]);

        return response()->json([
            'message'   => "{$count} record(s) marked as processed.",
            'processed' => $count,
        ]);
    }
}
