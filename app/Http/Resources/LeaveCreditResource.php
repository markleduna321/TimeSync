<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveCreditResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'year'           => $this->year,
            'total_credits'  => $this->total_credits,
            'used_credits'   => $this->used_credits,
            'carried_over'   => $this->carried_over,
            'balance'        => $this->balance,   // virtual accessor
            'leave_type'     => $this->whenLoaded('leaveType', fn () => [
                'id'    => $this->leaveType->id,
                'name'  => $this->leaveType->name,
                'code'  => $this->leaveType->code,
                'color' => $this->leaveType->color,
            ]),
            'transactions'   => $this->whenLoaded('leaveType', fn () => null), // not loaded here
        ];
    }
}
