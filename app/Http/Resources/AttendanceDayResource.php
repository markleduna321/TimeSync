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
        $leave      = $this->resource['leave']      ?? null;
        $rawTime = function ($model, string $column): ?string {
            $raw = $model?->getRawOriginal($column);
            return $raw ? substr($raw, 11, 8) : null;
        };

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
                    'old_clock_in_time'  => $rawTime($h, 'old_clock_in'),
                    'old_clock_out_time' => $rawTime($h, 'old_clock_out'),
                    'new_clock_in_time'  => $rawTime($h, 'new_clock_in'),
                    'new_clock_out_time' => $rawTime($h, 'new_clock_out'),
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
            'clock_in_time'        => $this->resource['clock_in_time']    ?? null,
            'clock_out_time'       => $this->resource['clock_out_time']   ?? null,
            'lunch_start'          => $this->resource['lunch_start']      ?? null,
            'lunch_end'            => $this->resource['lunch_end']        ?? null,
            'lunch_start_time'     => $this->resource['lunch_start_time'] ?? null,
            'lunch_end_time'       => $this->resource['lunch_end_time']   ?? null,
            'breaks'               => $this->resource['breaks']           ?? [],
            'total_worked_minutes' => $this->resource['total_worked_minutes'],
            'undertime_minutes'    => $this->resource['undertime_minutes']  ?? 0,
            'over_break_minutes'   => $this->resource['over_break_minutes'] ?? 0,
            'correction'           => $formatEntry($correction),
            'overtime'             => $formatEntry($overtime),
            'leave'                => $leave ? [
                'id'              => $leave->id,
                'status'          => $leave->status,
                'days_requested'  => $leave->days_requested,
                'half_day'        => $leave->half_day,
                'half_day_period' => $leave->half_day_period,
                'start_date'      => $leave->start_date?->format('Y-m-d'),
                'end_date'        => $leave->end_date?->format('Y-m-d'),
                'reason'          => $leave->reason,
                'leave_type'      => $leave->leaveType ? [
                    'id'    => $leave->leaveType->id,
                    'name'  => $leave->leaveType->name,
                    'code'  => $leave->leaveType->code,
                    'color' => $leave->leaveType->color,
                ] : null,
            ] : null,
            'holiday'              => $this->resource['holiday'] ?? null,
        ];
    }
}
