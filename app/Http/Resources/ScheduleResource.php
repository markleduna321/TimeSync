<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if (! $this->resource || ! $this->id) {
            return [];
        }

        return [
            'id'          => $this->id,
            'user_id'     => $this->user_id,
            'work_days'   => $this->work_days,
            'shift_start' => $this->shift_start,
            'shift_end'   => $this->shift_end,
        ];
    }
}
