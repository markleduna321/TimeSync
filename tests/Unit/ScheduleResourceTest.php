<?php

namespace Tests\Unit;

use App\Http\Resources\ScheduleResource;
use App\Models\Schedule;
use Tests\TestCase;

class ScheduleResourceTest extends TestCase
{
    public function test_it_includes_day_specific_shift_overrides(): void
    {
        $schedule = new Schedule([
            'user_id' => 1,
            'work_days' => ['Mon', 'Fri'],
            'shift_start' => '08:00',
            'shift_end' => '17:00',
            'time_by_day' => [
                'Mon' => ['shift_start' => '08:00', 'shift_end' => '17:00'],
                'Fri' => ['shift_start' => '18:00', 'shift_end' => '03:00'],
            ],
        ]);

        $payload = (new ScheduleResource($schedule))->toArray(request());

        $this->assertSame('08:00', $payload['shift_start']);
        $this->assertSame('17:00', $payload['shift_end']);
        $this->assertSame([
            'Mon' => ['shift_start' => '08:00', 'shift_end' => '17:00'],
            'Fri' => ['shift_start' => '18:00', 'shift_end' => '03:00'],
        ], $payload['time_by_day']);
    }
}
