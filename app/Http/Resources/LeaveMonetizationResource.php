<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveMonetizationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'user'            => [
                'id'   => $this->user?->id,
                'name' => $this->user?->name ?? '—',
            ],
            'leave_type'      => [
                'id'    => $this->leaveType?->id,
                'name'  => $this->leaveType?->name ?? '—',
                'color' => $this->leaveType?->color ?? '#6B7280',
            ],
            'year'            => $this->year,
            'eligible_days'   => (float) $this->eligible_days,
            'daily_rate_used' => (float) $this->daily_rate_used,
            'amount'          => (float) $this->amount,
            'status'          => $this->status,
            'notes'           => $this->notes,
            'processed_at'    => $this->processed_at?->toISOString(),
            'processed_by'    => $this->processedBy?->name,
            'created_at'      => $this->created_at?->toISOString(),
        ];
    }
}
