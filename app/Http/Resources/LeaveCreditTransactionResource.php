<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveCreditTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'type'           => $this->type,
            'amount'         => $this->amount,
            'reference_type' => $this->reference_type,
            'reference_id'   => $this->reference_id,
            'note'           => $this->note,
            'created_at'     => $this->created_at?->toISOString(),
            'created_by'     => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'leave_type'     => $this->whenLoaded('leaveType', fn () => [
                'name' => $this->leaveType->name,
                'code' => $this->leaveType->code,
            ]),
        ];
    }
}
