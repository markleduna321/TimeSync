<?php

namespace App\Notifications;

use App\Models\LeaveApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LeaveReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private LeaveApplication $application,
        private string $reviewerName
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $type   = $this->application->leaveType?->name ?? 'Leave';
        $status = $this->application->status;
        $period = $this->application->start_date->format('M d')
            . ($this->application->start_date->ne($this->application->end_date)
                ? ' – ' . $this->application->end_date->format('M d, Y')
                : ', ' . $this->application->start_date->format('Y'));

        return [
            'type'         => 'leave_reviewed',
            'leave_id'     => $this->application->id,
            'reviewer'     => $this->reviewerName,
            'status'       => $status,
            'leave_type'   => $type,
            'period'       => $period,
            'message'      => "Your {$type} application ({$period}) was {$status} by {$this->reviewerName}.",
        ];
    }
}
