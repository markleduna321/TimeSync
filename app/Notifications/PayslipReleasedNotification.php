<?php

namespace App\Notifications;

use App\Models\Payslip;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PayslipReleasedNotification extends Notification
{
    use Queueable;

    public function __construct(private Payslip $payslip) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $period  = $this->payslip->period_start->format('M d') . ' – ' . $this->payslip->period_end->format('M d, Y');
        $net     = number_format((float) $this->payslip->net_pay, 2);

        return [
            'type'       => 'payslip_released',
            'payslip_id' => $this->payslip->id,
            'period'     => $period,
            'net_pay'    => $this->payslip->net_pay,
            'message'    => "Your payslip for {$period} has been released. Net pay: ₱{$net}.",
        ];
    }
}
