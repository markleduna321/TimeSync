<?php

namespace App\Notifications;

use App\Models\Holiday;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HolidayAddedNotification extends Notification
{
    use Queueable;

    public function __construct(private Holiday $holiday) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $typeLabel = $this->holiday->type === 'regular' ? 'Regular' : 'Special';

        return [
            'type'         => 'holiday_added',
            'holiday_id'   => $this->holiday->id,
            'holiday_name' => $this->holiday->name,
            'date'         => $this->holiday->date->format('Y-m-d'),
            'message'      => "{$typeLabel} holiday \"{$this->holiday->name}\" added on {$this->holiday->date->format('M d, Y')}.",
        ];
    }
}
