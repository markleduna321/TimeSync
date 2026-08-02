<?php

namespace Tests\Unit;

use App\Http\Requests\StoreScheduleOverrideRequest;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class StoreScheduleOverrideRequestTest extends TestCase
{
    public function test_rest_day_override_allows_historical_dates_in_current_month_with_reason(): void
    {
        $user = User::factory()->create();
        $request = StoreScheduleOverrideRequest::create('/test', 'PUT', [
            'user_id' => $user->id,
            'date' => now()->subDay()->toDateString(),
            'demotes_to_restday' => true,
            'note' => 'Corrected through admin adjustment',
        ]);
        $validator = Validator::make($request->all(), $request->rules());

        $this->assertFalse($validator->fails(), $validator->errors()->toJson());
    }

    public function test_rest_day_override_requires_reason_when_toggling_day_status(): void
    {
        $user = User::factory()->create();
        $request = StoreScheduleOverrideRequest::create('/test', 'PUT', [
            'user_id' => $user->id,
            'date' => now()->toDateString(),
            'demotes_to_restday' => true,
        ]);
        $validator = Validator::make($request->all(), $request->rules());
        $validator->after(function ($validator) use ($request): void {
            $request->withValidator($validator);
        });
        $validator->validate();

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('note'));
    }

    public function test_rest_day_override_passes_without_swap_date(): void
    {
        $user = User::factory()->create();
        $request = StoreScheduleOverrideRequest::create('/test', 'PUT', [
            'user_id' => $user->id,
            'date' => now()->toDateString(),
            'demotes_to_restday' => true,
            'note' => 'Granting standalone rest day — no compensatory swap needed.',
        ]);
        $request->setContainer($this->app);
        $validator = Validator::make($request->all(), $request->rules());
        $validator->after(function ($validator) use ($request): void {
            $request->withValidator($validator);
        });

        $this->assertFalse($validator->fails(), $validator->errors()->toJson());
        $this->assertFalse($validator->errors()->has('swap_date'));
    }

    public function test_work_day_override_requires_swap_date(): void
    {
        $user = User::factory()->create();
        $request = StoreScheduleOverrideRequest::create('/test', 'PUT', [
            'user_id' => $user->id,
            'date' => now()->toDateString(),
            'promotes_to_workday' => true,
            'note' => 'Employee coming in on rest day.',
        ]);
        $request->setContainer($this->app);
        $validator = Validator::make($request->all(), $request->rules());
        $validator->after(function ($validator) use ($request): void {
            $request->withValidator($validator);
        });
        $validator->validate(); // prime: registers withValidator's closure in the after chain

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('swap_date'));
    }

    public function test_schedule_overrides_table_has_swap_date_column(): void
    {
        $this->assertTrue(Schema::hasColumn('schedule_overrides', 'swap_date'));
    }
}
