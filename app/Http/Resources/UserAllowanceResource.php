<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserAllowanceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'             => $this->id,
            'user_id'        => $this->user_id,
            'amount'         => $this->amount,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to'   => $this->effective_to?->toDateString(),
            'is_active'      => $this->is_active,
            'description'    => $this->description,
            'allowance_type' => new AllowanceTypeResource($this->whenLoaded('allowanceType')),
        ];
    }
}
