<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                        => $this->id,
            'name'                      => $this->name,
            'code'                      => $this->code,
            'color'                     => $this->color,
            'min_advance_days'          => $this->min_advance_days,
            'max_consecutive_days'      => $this->max_consecutive_days,
            'requires_proof_above_days' => $this->requires_proof_above_days,
            'is_paid'                   => $this->is_paid,
            'is_active'                 => $this->is_active,
            'policy'                    => $this->whenLoaded('creditPolicy', fn () => [
                'allocation_type' => $this->creditPolicy->allocation_type,
                'monthly_rate'    => $this->creditPolicy->monthly_rate,
                'annual_amount'   => $this->creditPolicy->annual_amount,
                'is_active'       => $this->creditPolicy->is_active,
            ]),
        ];
    }
}
