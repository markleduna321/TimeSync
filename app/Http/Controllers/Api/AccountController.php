<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAccountRequest;
use App\Http\Requests\UpdateAccountRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AccountController extends Controller
{
    /**
     * GET /api/accounts
     * Pass ?active_only=1 to filter for dropdown use.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Account::class);

        $query = Account::orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return AccountResource::collection($query->get());
    }

    /**
     * POST /api/accounts
     */
    public function store(StoreAccountRequest $request): AccountResource
    {
        $this->authorize('create', Account::class);

        $account = Account::create([
            'name'        => $request->name,
            'code'        => strtoupper($request->code),
            'description' => $request->description,
            'is_active'   => true,
        ]);

        return new AccountResource($account);
    }

    /**
     * PATCH /api/accounts/{account}
     */
    public function update(UpdateAccountRequest $request, Account $account): AccountResource
    {
        $this->authorize('update', Account::class);

        $data = $request->validated();

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $account->update($data);

        return new AccountResource($account->fresh());
    }

    /**
     * DELETE /api/accounts/{account} — soft-deactivate only.
     */
    public function destroy(Account $account): JsonResponse
    {
        $this->authorize('delete', Account::class);

        $account->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
