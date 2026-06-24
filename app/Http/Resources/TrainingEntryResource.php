<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TrainingEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'user_id'     => $this->user_id,
            'date'        => $this->date?->format('Y-m-d'),
            'hours'       => (float) $this->hours,
            'description' => $this->description,
            'created_by'  => $this->created_by,
            'created_at'  => $this->created_at?->toISOString(),
        ];
    }
}
