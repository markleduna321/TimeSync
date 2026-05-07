<?php

namespace App\Notifications;

use App\Models\AttendanceCorrection;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CorrectionFiledNotification extends Notification
{
    use Queueable;

    public function __construct(
        private AttendanceCorrection $correction,
        private string $actorName
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $isOt   = $this->correction->type === 'overtime';
        $label  = $isOt ? 'OT request' : 'correction request';
        $type   = $isOt ? 'ot_filed' : 'correction_filed';

        return [
            'type'          => $type,
            'correction_id' => $this->correction->id,
            'actor_name'    => $this->actorName,
            'date'          => $this->correction->date->format('Y-m-d'),
            'message'       => "{$this->actorName} filed a {$label} for {$this->correction->date->format('M d, Y')}.",
        ];
    }
}
