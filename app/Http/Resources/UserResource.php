<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
            'first_name'        => $this->first_name,
            'middle_name'       => $this->middle_name,
            'last_name'         => $this->last_name,
            'name'              => $this->name, // computed accessor: first + middle + last
            'email'             => $this->email,
            'avatar_url'        => $this->avatar ? Storage::disk('public')->url($this->avatar) : null,
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
            'department'        => $this->whenLoaded('department', fn () =>
                $this->department ? new DepartmentResource($this->department) : null
            ),
            'account'           => $this->whenLoaded('account', fn () =>
                $this->account ? new AccountResource($this->account) : null
            ),
            'department_id'     => $this->department_id,
            'account_id'        => $this->account_id,
            'email_verified_at' => $this->email_verified_at,
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
