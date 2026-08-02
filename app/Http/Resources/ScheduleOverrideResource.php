<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleOverrideResource extends JsonResource
{
    protected function formatDateValue($value): ?string
    {
        if (!$value) {
            return null;
        }

        if ($value instanceof \Carbon\Carbon) {
            return $value->format('Y-m-d');
        }

        if (is_string($value)) {
            return substr($value, 0, 10);
        }

        return null;
    }

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
            'demotes_to_restday'  => (bool) $this->demotes_to_restday,
            'swap_date'           => $this->formatDateValue($this->swap_date),
            'note'                => $this->note,
            'created_by'          => $this->created_by,
            'created_at'          => $this->created_at?->toISOString(),
        ];
    }
}
