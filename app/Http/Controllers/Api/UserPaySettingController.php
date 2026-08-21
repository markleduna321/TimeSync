<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPaySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserPaySettingController extends Controller
{
    private const PAY_TYPES = [
        'NIGHT_DIFF'  => 'Night Shift Differential',
        'HOLIDAY_PAY' => 'Holiday Pay',
    ];

    /**
     * GET /api/users/{user}/pay-settings
     * Returns all pay setting toggles for the given user.
     * Missing rows default to is_enabled = true.
     */
    public function index(User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $settings = UserPaySetting::where('user_id', $user->id)
            ->pluck('is_enabled', 'code');

        $result = collect(self::PAY_TYPES)->map(fn ($name, $code) => [
            'code'       => $code,
            'name'       => $name,
            'is_enabled' => (bool) ($settings[$code] ?? true),
        ])->values();

        return response()->json(['data' => $result]);
    }

    /**
     * PATCH /api/users/{user}/pay-settings/{code}
     * Toggle a single pay setting for this user.
     */
    public function update(Request $request, User $user, string $code): JsonResponse
    {
        $this->authorize('update', $user);

        $code = strtoupper($code);

        if (! array_key_exists($code, self::PAY_TYPES)) {
            abort(422, 'Invalid pay setting code.');
        }

        $request->validate(['is_enabled' => 'required|boolean']);

        UserPaySetting::updateOrCreate(
            ['user_id' => $user->id, 'code' => $code],
            ['is_enabled' => $request->boolean('is_enabled')]
        );

        return response()->json([
            'data' => [
                'code'       => $code,
                'name'       => self::PAY_TYPES[$code],
                'is_enabled' => $request->boolean('is_enabled'),
            ],
        ]);
    }
}
