<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BreakConfigResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if (! $this->resource || ! $this->id) {
            return [
                'break_allowed'          => false,
                'break_count'            => 1,
                'break_duration_minutes' => 15,
                'lunch_duration_minutes' => 60,
            ];
        }

        return [
            'id'                     => $this->id,
            'user_id'                => $this->user_id,
            'break_allowed'          => $this->break_allowed,
            'break_count'            => $this->break_count,
            'break_duration_minutes' => $this->break_duration_minutes,
            'lunch_duration_minutes' => $this->lunch_duration_minutes,
        ];
    }
}
