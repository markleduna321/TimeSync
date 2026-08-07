<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExternalUserResource extends JsonResource
{
    public function toArray($request): array
    {
        $schedule = $this->whenLoaded('schedule', function () {
            $s = $this->schedule;
            if (! $s) {
                return null;
            }
            return [
                'work_days'   => $s->work_days ?? [],
                'shift_start' => $s->shift_start ? substr($s->shift_start, 0, 5) : null,
                'shift_end'   => $s->shift_end   ? substr($s->shift_end,   0, 5) : null,
                'time_by_day' => $s->time_by_day ?? null,
            ];
        });

        return [
            'id'         => $this->id,
            'first_name' => $this->first_name,
            'last_name'  => $this->last_name,
            'name'       => $this->name,
            'email'      => $this->email,
            'schedule'   => $schedule,
            // Upcoming overrides — only present on the single-user show endpoint
            'schedule_overrides' => $this->when(
                $this->relationLoaded('scheduleOverrides'),
                fn () => $this->scheduleOverrides?->values()
            ),
        ];
    }
}
