<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AllowanceTypeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                      => $this->id,
            'name'                    => $this->name,
            'code'                    => $this->code,
            'is_taxable'              => $this->is_taxable,
            'monthly_de_minimis_limit' => $this->monthly_de_minimis_limit,
            'description'             => $this->description,
        ];
    }
}
