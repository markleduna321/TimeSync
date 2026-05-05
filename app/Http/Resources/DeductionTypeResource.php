<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeductionTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'code'             => $this->code,
            'name'             => $this->name,
            'is_government'    => $this->is_government,
            'is_auto_computed' => $this->is_auto_computed,
            'is_assignable'    => $this->is_assignable,
            'is_active'        => $this->is_active,
        ];
    }
}
