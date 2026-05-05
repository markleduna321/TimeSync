<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HolidayResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'date'        => $this->date->toDateString(),
            'name'        => $this->name,
            'type'        => $this->type,
            'description' => $this->description,
            'created_at'  => $this->created_at?->toISOString(),
        ];
    }
}
