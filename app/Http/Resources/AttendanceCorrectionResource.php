<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AttendanceCorrectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'date'                => $this->date?->format('Y-m-d'),
            'reason'              => $this->reason,
            'proof_url'           => $this->proof_path
                ? route('attendance.corrections.proof', $this->id)
                : null,
            'requested_clock_in'    => $this->requested_clock_in,
            'requested_clock_out'   => $this->requested_clock_out,
            'effective_shift_start' => $this->effective_shift_start,
            'effective_shift_end'   => $this->effective_shift_end,
            'type'                => $this->type,
            'status'              => $this->status,
            'admin_note'          => $this->admin_note,
            'reviewed_at'         => $this->reviewed_at?->toISOString(),
            'created_at'          => $this->created_at?->toISOString(),
            'deleted_at'          => $this->deleted_at?->toISOString(),
            'deleted_reason'      => $this->deleted_reason,
            'deleted_by'          => $this->whenLoaded('deletedBy', fn () => $this->deletedBy ? [
                'id'   => $this->deletedBy->id,
                'name' => $this->deletedBy->name,
            ] : null),
            'user'                => $this->whenLoaded('user', fn () => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
            ]),
            'reviewed_by'         => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id'   => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ] : null),
            'history'             => $this->whenLoaded('history', fn () => $this->history->map(fn ($h) => [
                'id'            => $h->id,
                'old_clock_in'  => $h->old_clock_in?->toISOString(),
                'old_clock_out' => $h->old_clock_out?->toISOString(),
                'new_clock_in'  => $h->new_clock_in?->toISOString(),
                'new_clock_out' => $h->new_clock_out?->toISOString(),
                'changed_by'    => $h->changedBy?->name,
                'changed_at'    => $h->created_at?->toISOString(),
            ])->values()),
        ];
    }
}
