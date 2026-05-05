<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserDeductionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'user_id'          => $this->user_id,
            'deduction_type'   => $this->whenLoaded('deductionType', fn () => new DeductionTypeResource($this->deductionType)),
            'description'      => $this->description,
            'amount'           => $this->amount,
            'effective_from'   => $this->effective_from?->toDateString(),
            'effective_until'  => $this->effective_until?->toDateString(),
            'is_active'        => $this->is_active,
            'added_by'         => $this->whenLoaded('addedBy', fn () => $this->addedBy?->name),
            'created_at'       => $this->created_at?->toISOString(),
        ];
    }
}
