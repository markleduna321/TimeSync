<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserExperienceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'type'         => $this->type,
            'title'        => $this->title,
            'organization' => $this->organization,
            'location'     => $this->location,
            'start_date'   => $this->start_date?->toDateString(),
            'end_date'     => $this->end_date?->toDateString(),
            'is_current'   => $this->is_current,
            'description'  => $this->description,
            'created_at'   => $this->created_at?->toISOString(),
        ];
    }
}
