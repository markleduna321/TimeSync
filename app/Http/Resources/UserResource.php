<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

// ScheduleResource is in the same namespace — no separate import needed.

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        return [
            'id'                => $this->when(isset($this->id), $this->id),
            'name'              => $this->name,
            'email'             => $this->email,
            'monthly_salary'    => $this->monthly_salary,
            'roles'             => $this->whenLoaded('roles', fn () =>
                $this->roles->map(fn ($r) => [
                    'id'    => $r->id,
                    'name'  => $r->name,
                    'slug'  => $r->slug,
                    'level' => $r->level,
                ])->values()
            ),
            'schedule'          => $this->whenLoaded('schedule', fn () =>
                $this->schedule ? new ScheduleResource($this->schedule) : null
            ),
            'email_verified_at' => $this->email_verified_at,
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
