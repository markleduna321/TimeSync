<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if (! $this->resource) {
            return [];
        }

        return [
            'id'            => $this->id,
            'user_id'       => $this->user_id,
            'work_days'     => $this->work_days ?? [],
            'shift_start'   => $this->shift_start ? substr($this->shift_start, 0, 5) : null,
            'shift_end'     => $this->shift_end   ? substr($this->shift_end,   0, 5) : null,
            'time_by_day'   => $this->time_by_day ?? [],
            'schedule_type' => $this->schedule_type ?? 'standard',
        ];
    }
}
