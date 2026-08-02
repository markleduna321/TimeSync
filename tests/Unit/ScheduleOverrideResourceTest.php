<?php

namespace Tests\Unit;

use App\Http\Resources\ScheduleOverrideResource;
use App\Models\ScheduleOverride;
use Tests\TestCase;

class ScheduleOverrideResourceTest extends TestCase
{
    public function test_resource_formats_string_swap_date_without_error(): void
    {
        $resource = new ScheduleOverrideResource(new ScheduleOverride([
            'swap_date' => '2026-07-23',
        ]));

        $data = $resource->toArray(request());

        $this->assertSame('2026-07-23', $data['swap_date']);
    }
}
