<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkAllocateLeaveCreditRequest;
use App\Http\Requests\UpsertLeaveCreditRequest;
use App\Http\Resources\LeaveCreditResource;
use App\Http\Resources\LeaveCreditTransactionResource;
use App\Models\LeaveCredit;
use App\Models\LeaveCreditTransaction;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class LeaveCreditController extends Controller
{
    /**
     * GET /api/leave/credits/me
     * Returns only the leave types explicitly assigned to the authenticated user for the current year.
     * Pass ?include_transactions=1 to also receive the last 5 credit transactions.
     */
    public function myCredits(Request $request): AnonymousResourceCollection|JsonResponse
    {
        $year    = now()->year;
        $userId  = auth()->id();

        $credits = LeaveCredit::with('leaveType')
            ->where('user_id', $userId)
            ->where('year', $year)
            ->get();

        if ($request->boolean('include_transactions')) {
            $transactions = LeaveCreditTransaction::with('leaveType')
                ->where('user_id', $userId)
                ->orderByDesc('created_at')
                ->take(5)
                ->get();

            return response()->json([
                'data'         => LeaveCreditResource::collection($credits),
                'transactions' => LeaveCreditTransactionResource::collection($transactions),
            ]);
        }

        return LeaveCreditResource::collection($credits);
    }

    /**
     * GET /api/admin/users/{user}/leave-credits
     * Admin view of any user's credits + transaction history (assigned types only).
     */
    public function userCredits(User $user): JsonResponse
    {
        $this->authorize('update', $user); // admin/manager only

        $year = (int) request()->query('year', now()->year);

        $credits = LeaveCredit::with('leaveType')
            ->where('user_id', $user->id)
            ->where('year', $year)
            ->get();

        // Transaction history for this user + year
        $transactions = LeaveCreditTransaction::with(['leaveType', 'creator'])
            ->where('user_id', $user->id)
            ->whereYear('created_at', $year)
            ->orderByDesc('created_at')
            ->take(50)
            ->get();

        return response()->json([
            'data'         => LeaveCreditResource::collection($credits),
            'transactions' => LeaveCreditTransactionResource::collection($transactions),
        ]);
    }

    /**
     * POST /api/admin/users/{user}/leave-credits/assign
     * Assign a leave type to a user for a given year, auto-initialising credits.
     */
    public function assign(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'year'          => 'nullable|integer|min:2000|max:2100',
        ]);

        $year   = (int) ($request->year ?? now()->year);
        $typeId = $request->leave_type_id;

        $existing = LeaveCredit::where('user_id', $user->id)
            ->where('leave_type_id', $typeId)
            ->where('year', $year)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'This leave type is already assigned for ' . $year . '.'], 422);
        }

        $type = LeaveType::with('creditPolicy')->findOrFail($typeId);

        DB::transaction(function () use ($user, $type, $year) {
            $credit = LeaveCredit::create([
                'user_id'       => $user->id,
                'leave_type_id' => $type->id,
                'year'          => $year,
                'total_credits' => 0,
                'used_credits'  => 0,
                'carried_over'  => 0,
            ]);

            $this->autoInitCredit($credit, $type, $year);
        });

        return $this->userCredits($user);
    }

    /**
     * DELETE /api/admin/users/{user}/leave-credits/{leaveType}
     * Remove a leave type assignment from a user for the given year (query param).
     */
    public function removeAssignment(Request $request, User $user, LeaveType $leaveType): JsonResponse
    {
        $this->authorize('update', $user);

        $year = (int) ($request->query('year') ?? now()->year);

        LeaveCredit::where('user_id', $user->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year)
            ->delete();

        return $this->userCredits($user);
    }

    /**
     * POST /api/admin/users/{user}/leave-credits
     * Admin manually sets or adds credits for a user.
     */
    public function upsert(UpsertLeaveCreditRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $year       = $request->year;
        $typeId     = $request->leave_type_id;
        $action     = $request->action;   // 'set' or 'add'
        $amount     = (float) $request->amount;
        $note       = $request->note;

        DB::transaction(function () use ($user, $year, $typeId, $action, $amount, $note) {
            $credit = LeaveCredit::firstOrCreate(
                ['user_id' => $user->id, 'leave_type_id' => $typeId, 'year' => $year],
                ['total_credits' => 0, 'used_credits' => 0, 'carried_over' => 0]
            );

            $old = (float) $credit->total_credits;

            if ($action === 'set') {
                $credit->total_credits = $amount;
            } else {
                $credit->total_credits = $old + $amount;
            }

            $credit->save();

            $diff = (float) $credit->total_credits - $old;

            LeaveCreditTransaction::create([
                'user_id'        => $user->id,
                'leave_type_id'  => $typeId,
                'type'           => $diff >= 0 ? 'credit' : 'debit',
                'amount'         => abs($diff),
                'reference_type' => 'manual',
                'note'           => $note ?? ($action === 'set' ? "Manual allocation set to {$amount}" : "Manual addition of {$amount}"),
                'created_by'     => auth()->id(),
            ]);
        });

        return $this->userCredits($user);
    }

    /**
     * POST /api/admin/leave-credits/bulk-allocate
     * Grant annual lump credits to ALL active users for a leave type + year.
     */
    public function bulkAllocate(BulkAllocateLeaveCreditRequest $request): JsonResponse
    {
        $typeId = $request->leave_type_id;
        $year   = $request->year;
        $amount = (float) $request->amount;
        $note   = $request->note ?? "Annual allocation {$year}";
        $actorId = auth()->id();

        $users   = User::all();
        $count   = 0;

        DB::transaction(function () use ($users, $typeId, $year, $amount, $note, $actorId, &$count) {
            foreach ($users as $user) {
                $credit = LeaveCredit::firstOrCreate(
                    ['user_id' => $user->id, 'leave_type_id' => $typeId, 'year' => $year],
                    ['total_credits' => 0, 'used_credits' => 0, 'carried_over' => 0]
                );

                $credit->total_credits = $amount;
                $credit->save();

                LeaveCreditTransaction::create([
                    'user_id'        => $user->id,
                    'leave_type_id'  => $typeId,
                    'type'           => 'credit',
                    'amount'         => $amount,
                    'reference_type' => 'manual',
                    'note'           => $note,
                    'created_by'     => $actorId,
                ]);

                $count++;
            }
        });

        return response()->json([
            'message' => "Credits allocated to {$count} user(s).",
            'count'   => $count,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Compute the prorated lump-sum amount for the given year.
     *
     * - Current year : prorate by remaining months inclusive of the current month.
     *   e.g. assigned in May (month 5) → 8 remaining months → 8/12 × annual_amount
     * - Future year  : full annual_amount (all 12 months credited up front).
     * - Past year    : full annual_amount (retroactive allocation).
     */
    private function proratedLumpSum(float $annualAmount, int $year): float
    {
        if ($year === now()->year) {
            $remaining = 13 - now()->month; // 1–12
            return round($annualAmount * $remaining / 12, 2);
        }

        return $annualAmount;
    }

    /**
     * If a LeaveCredit record was just created and the leave type uses lump_sum
     * allocation, automatically set the (prorated) opening balance and record
     * a transaction for auditability.
     */
    private function autoInitCredit(LeaveCredit $credit, LeaveType $type, int $year): void
    {
        if (! $credit->wasRecentlyCreated) {
            return;
        }

        $policy = $type->creditPolicy;

        if (! $policy || ! $policy->is_active || $policy->allocation_type !== 'annual_lump') {
            return;
        }

        $amount = $this->proratedLumpSum((float) $policy->annual_amount, $year);

        if ($amount <= 0) {
            return;
        }

        $credit->total_credits = $amount;
        $credit->save();

        LeaveCreditTransaction::create([
            'user_id'        => $credit->user_id,
            'leave_type_id'  => $type->id,
            'type'           => 'credit',
            'amount'         => $amount,
            'reference_type' => 'initial_allocation',
            'note'           => 'Initial lump-sum allocation (' . $year . ')'
                                . ($year === now()->year ? ' — prorated from ' . now()->format('F') : ''),
            'created_by'     => null,
        ]);
    }
}
