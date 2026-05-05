<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AttendanceDayResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $correction = $this->resource['correction'] ?? null;
        $overtime   = $this->resource['overtime']   ?? null;

        $formatEntry = fn ($entry) => $entry ? [
            'id'                   => $entry->id,
            'type'                 => $entry->type,
            'status'               => $entry->status,
            'reason'               => $entry->reason,
            'requested_clock_in'   => $entry->requested_clock_in,
            'requested_clock_out'  => $entry->requested_clock_out,
            'admin_note'           => $entry->admin_note,
            'created_at'           => $entry->created_at?->toISOString(),
            'history'              => $entry->relationLoaded('history')
                ? $entry->history->map(fn ($h) => [
                    'old_clock_in'  => $h->old_clock_in?->toISOString(),
                    'old_clock_out' => $h->old_clock_out?->toISOString(),
                    'new_clock_in'  => $h->new_clock_in?->toISOString(),
                    'new_clock_out' => $h->new_clock_out?->toISOString(),
                    'changed_by'    => $h->changedBy?->name,
                    'changed_at'    => $h->created_at?->toISOString(),
                ])->values()->all()
                : [],
        ] : null;

        return [
            'date'                 => $this->resource['date'],
            'day_of_week'          => $this->resource['day_of_week'],
            'status'               => $this->resource['status'],
            'clock_in'             => $this->resource['clock_in'],
            'clock_out'            => $this->resource['clock_out'],
            'total_worked_minutes' => $this->resource['total_worked_minutes'],
            'undertime_minutes'    => $this->resource['undertime_minutes'] ?? 0,
            'correction'           => $formatEntry($correction),
            'overtime'             => $formatEntry($overtime),
        ];
    }
}
