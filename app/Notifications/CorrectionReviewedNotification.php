<?php

namespace App\Notifications;

use App\Models\AttendanceCorrection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CorrectionReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private AttendanceCorrection $correction,
        private string $reviewerName
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $isOt    = $this->correction->type === 'overtime';
        $label   = $isOt ? 'OT request' : 'correction request';
        $status  = $this->correction->status; // 'approved' | 'rejected'
        $type    = $isOt ? 'ot_reviewed' : 'correction_reviewed';
        $verb    = $status === 'approved' ? 'approved' : 'rejected';

        return [
            'type'          => $type,
            'correction_id' => $this->correction->id,
            'reviewer_name' => $this->reviewerName,
            'status'        => $status,
            'date'          => $this->correction->date->format('Y-m-d'),
            'message'       => "Your {$label} for {$this->correction->date->format('M d, Y')} was {$verb} by {$this->reviewerName}.",
        ];
    }
}
