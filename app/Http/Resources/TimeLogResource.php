<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimeLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if (! $this->resource || ! $this->id) {
            return ['status' => null, 'date' => null];
        }

        return [
            'id'                   => $this->id,
            'date'                 => $this->date?->format('Y-m-d'),
            'clock_in'             => $this->clock_in?->toISOString(),
            'clock_out'            => $this->clock_out?->toISOString(),
            'lunch_start'          => $this->lunch_start?->toISOString(),
            'lunch_end'            => $this->lunch_end?->toISOString(),
            'breaks'               => $this->breaks ?? [],
            'status'               => $this->status,
            'total_worked_minutes' => $this->total_worked_minutes,
        ];
    }
}
