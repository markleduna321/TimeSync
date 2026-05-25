<?php

namespace App\Http\Requests;

use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreLeaveApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'leave_type_id'  => 'required|exists:leave_types,id',
            'start_date'     => 'required|date|date_format:Y-m-d',
            'end_date'       => 'required|date|date_format:Y-m-d|after_or_equal:start_date',
            'half_day'       => 'boolean',
            'half_day_period'=> 'nullable|in:AM,PM|required_if:half_day,true',
            'reason'         => 'nullable|string|max:1000',
            'proof'          => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $typeId = $this->input('leave_type_id');
            if (! $typeId) return;

            $leaveType = LeaveType::find($typeId);
            if (! $leaveType || ! $leaveType->is_active) {
                $v->errors()->add('leave_type_id', 'This leave type is not available.');
                return;
            }

            // Advance-notice check
            if ($leaveType->min_advance_days > 0) {
                $earliestAllowed = Carbon::today()->addDays($leaveType->min_advance_days)->toDateString();
                if ($this->input('start_date') < $earliestAllowed) {
                    $v->errors()->add(
                        'start_date',
                        "{$leaveType->name} must be filed at least {$leaveType->min_advance_days} day(s) in advance."
                    );
                }
            }

            // Max consecutive days check
            if ($leaveType->max_consecutive_days) {
                $start = Carbon::parse($this->input('start_date'));
                $end   = Carbon::parse($this->input('end_date'));
                $days  = $start->diffInDays($end) + 1;
                if ($days > $leaveType->max_consecutive_days) {
                    $v->errors()->add(
                        'end_date',
                        "{$leaveType->name} cannot exceed {$leaveType->max_consecutive_days} consecutive day(s)."
                    );
                }
            }
        });
    }
}
