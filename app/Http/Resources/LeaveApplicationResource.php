<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class LeaveApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'start_date'     => $this->start_date?->format('Y-m-d'),
            'end_date'       => $this->end_date?->format('Y-m-d'),
            'days_requested' => $this->days_requested,
            'half_day'       => $this->half_day,
            'half_day_period'=> $this->half_day_period,
            'reason'         => $this->reason,
            'proof_url'      => $this->proof_path
                ? Storage::disk('local')->temporaryUrl($this->proof_path, now()->addMinutes(30))
                : null,
            'status'         => $this->status,
            'admin_note'     => $this->admin_note,
            'reviewed_at'    => $this->reviewed_at?->toISOString(),
            'created_at'     => $this->created_at?->toISOString(),
            'leave_type'     => $this->whenLoaded('leaveType', fn () => [
                'id'    => $this->leaveType->id,
                'name'  => $this->leaveType->name,
                'code'  => $this->leaveType->code,
                'color' => $this->leaveType->color,
            ]),
            'user'           => $this->whenLoaded('user', fn () => [
                'id'        => $this->user->id,
                'name'      => $this->user->name,
                'email'     => $this->user->email,
                'avatar_url'=> $this->user->avatar
                    ? Storage::disk('public')->url($this->user->avatar)
                    : null,
            ]),
            'reviewed_by'    => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id'   => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ] : null),
        ];
    }
}
