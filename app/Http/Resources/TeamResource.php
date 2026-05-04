<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'leader_id'   => $this->leader_id,
            'leader'      => $this->whenLoaded('leader', fn () => [
                'id'    => $this->leader->id,
                'name'  => $this->leader->name,
                'email' => $this->leader->email,
            ]),
            'members'     => $this->whenLoaded('members', fn () =>
                $this->members->map(fn ($m) => [
                    'id'    => $m->id,
                    'name'  => $m->name,
                    'email' => $m->email,
                ])
            ),
            'members_count' => $this->whenLoaded('members', fn () => $this->members->count()),
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
