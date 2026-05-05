<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserGovernmentDeductionSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserGovernmentDeductionController extends Controller
{
    private const GOV_TYPES = [
        'SSS'            => 'SSS Contribution',
        'PHILHEALTH'     => 'PhilHealth Contribution',
        'PAGIBIG'        => 'Pag-IBIG Contribution',
        'WITHHOLDING_TAX'=> 'Withholding Tax (TRAIN)',
    ];

    /**
     * GET /api/users/{user}/government-deductions
     * Returns all 4 gov contribution toggles for the given user.
     * Missing rows default to is_enabled = true.
     */
    public function index(User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $settings = UserGovernmentDeductionSetting::where('user_id', $user->id)
            ->pluck('is_enabled', 'code');

        $result = collect(self::GOV_TYPES)->map(fn ($name, $code) => [
            'code'       => $code,
            'name'       => $name,
            'is_enabled' => (bool) ($settings[$code] ?? true),
        ])->values();

        return response()->json(['data' => $result]);
    }

    /**
     * PATCH /api/users/{user}/government-deductions/{code}
     * Toggle a single government contribution for this user.
     */
    public function update(Request $request, User $user, string $code): JsonResponse
    {
        $this->authorize('update', $user);

        $code = strtoupper($code);

        if (! array_key_exists($code, self::GOV_TYPES)) {
            abort(422, 'Invalid government deduction code.');
        }

        $request->validate(['is_enabled' => 'required|boolean']);

        UserGovernmentDeductionSetting::updateOrCreate(
            ['user_id' => $user->id, 'code' => $code],
            ['is_enabled' => $request->boolean('is_enabled')]
        );

        return response()->json([
            'data' => [
                'code'       => $code,
                'name'       => self::GOV_TYPES[$code],
                'is_enabled' => $request->boolean('is_enabled'),
            ],
        ]);
    }
}
