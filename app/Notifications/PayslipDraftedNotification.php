<?php

namespace App\Notifications;

use App\Models\Payslip;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PayslipDraftedNotification extends Notification
{
    use Queueable;

    public function __construct(private Payslip $payslip) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $employee = $this->payslip->user;
        $period   = $this->payslip->period_start->format('M d') . ' – ' . $this->payslip->period_end->format('M d, Y');

        return [
            'type'           => 'payslip_draft',
            'payslip_id'     => $this->payslip->id,
            'employee_name'  => $employee?->name ?? 'Employee',
            'period'         => $period,
            'message'        => "Draft payslip for {$employee?->name} ({$period}) is ready for review.",
        ];
    }
}
