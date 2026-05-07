<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'         => $this->id,
            'type'       => $this->data['type'] ?? 'unknown',
            'message'    => $this->data['message'] ?? '',
            'data'       => $this->data,
            'read'       => ! is_null($this->read_at),
            'read_at'    => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
