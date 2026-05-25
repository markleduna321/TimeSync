<?php

namespace App\Notifications;

use App\Models\LeaveApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LeaveFiledNotification extends Notification
{
    use Queueable;

    public function __construct(
        private LeaveApplication $application,
        private string $actorName
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $type = $this->application->leaveType?->name ?? 'Leave';
        $period = $this->application->start_date->format('M d')
            . ($this->application->start_date->ne($this->application->end_date)
                ? ' – ' . $this->application->end_date->format('M d, Y')
                : ', ' . $this->application->start_date->format('Y'));

        return [
            'type'             => 'leave_filed',
            'leave_id'         => $this->application->id,
            'actor_name'       => $this->actorName,
            'leave_type'       => $type,
            'period'           => $period,
            'message'          => "{$this->actorName} filed a {$type} application for {$period}.",
        ];
    }
}
