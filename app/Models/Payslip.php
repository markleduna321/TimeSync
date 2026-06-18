<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    protected $fillable = [
        'user_id',
        'period_start',
        'period_end',
        'pay_date',
        'monthly_salary',
        'daily_rate',
        'basic_pay',
        'gross_pay',
        'total_deductions',
        'net_pay',
        'taxable_income',
        'days_scheduled',
        'days_worked',
        'days_absent',
        'paid_leave_days',
        'unpaid_leave_days',
        'holiday_days',
        'holiday_days_worked',
        'late_minutes',
        'undertime_minutes',
        'over_break_minutes',
        'ot_minutes',
        'rest_day_minutes',
        'rest_day_ot_minutes',
        'nd_minutes',
        'status',
        'cutoff_type',
        // Which basic-pay formula was used: 'days_worked' or 'flat_rate'
        'method',
        'generated_by',
        'released_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'pay_date'     => 'date',
        'released_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayslipLine::class)->orderBy('category')->orderBy('sort_order');
    }
}
