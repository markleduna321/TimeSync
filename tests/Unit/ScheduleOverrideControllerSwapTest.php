<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\ScheduleOverrideController;
use App\Http\Requests\StoreScheduleOverrideRequest;
use App\Models\ScheduleOverride;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class ScheduleOverrideControllerSwapTest extends TestCase
{
    use RefreshDatabase;

    public function test_workday_to_restday_swap_flips_both_dates(): void
    {
        $user = User::factory()->create();
        Auth::login($user);
        Gate::before(function ($user, $ability) {
            return true;
        });

        $request = StoreScheduleOverrideRequest::create('/test', 'PUT', [
            'user_id' => $user->id,
            'date' => '2026-07-25',
            'swap_date' => '2026-07-23',
            'promotes_to_workday' => false,
            'demotes_to_restday' => true,
            'note' => 'Swap to rest day',
        ]);
        $request->setContainer($this->app);
        $request->setRedirector($this->app->make(Redirector::class));
        $this->app->instance('request', $request);
        $request->validateResolved();

        $controller = new ScheduleOverrideController();
        $response = $controller->upsert($request, $user);

        $this->assertSame(201, $response->getStatusCode());

        $target = ScheduleOverride::where('user_id', $user->id)->where('date', '2026-07-25')->first();
        $swap = ScheduleOverride::where('user_id', $user->id)->where('date', '2026-07-23')->first();

        $this->assertNotNull($target);
        $this->assertNotNull($swap);
        $this->assertTrue($target->demotes_to_restday);
        $this->assertFalse($target->promotes_to_workday);
        $this->assertTrue($swap->promotes_to_workday);
        $this->assertFalse($swap->demotes_to_restday);
    }
}
