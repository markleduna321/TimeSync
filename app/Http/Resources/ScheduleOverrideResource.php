<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleOverrideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'user_id'             => $this->user_id,
            'date'                => $this->date?->format('Y-m-d'),
            // Trim seconds from stored HH:MM:SS → HH:MM
            'shift_start'         => $this->shift_start ? substr($this->shift_start, 0, 5) : null,
            'shift_end'           => $this->shift_end   ? substr($this->shift_end,   0, 5) : null,
            'promotes_to_workday' => (bool) $this->promotes_to_workday,
            'note'                => $this->note,
            'created_by'          => $this->created_by,
            'created_at'          => $this->created_at?->toISOString(),
        ];
    }
}
