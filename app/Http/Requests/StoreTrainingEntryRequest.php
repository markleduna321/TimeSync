<?php

namespace App\Http\Requests;

use App\Models\ScheduleOverride;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled in the controller via Policy.
        return true;
    }

    public function rules(): array
    {
        return [
            'date'        => ['required', 'date', 'after_or_equal:today'],
            'hours'       => ['required', 'numeric', 'min:0.25', 'max:24'],
            'description' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.after_or_equal' => 'Training entries can only be set for today or future dates.',
            'hours.min'           => 'Minimum training duration is 0.25 hours (15 minutes).',
        ];
    }

    /**
     * Block training on rest days unless a promotes_to_workday override exists.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->route('user');
            $date = $this->input('date');

            if (! $user || ! $date) {
                return;
            }

            $user->loadMissing('schedule');
            $workDays = $user->schedule?->work_days ?? [];

            try {
                $carbon = Carbon::parse($date);
            } catch (\Exception) {
                return; // date rule already handles format validation
            }

            $dayShort = $carbon->format('D');           // 'Mon', 'Tue', …
            $dayLong  = strtolower($carbon->englishDayOfWeek); // 'monday', …

            $isWorkDay = in_array($dayShort, $workDays)
                      || in_array($dayLong,  $workDays);

            if (! $isWorkDay) {
                $hasPromotion = ScheduleOverride::where('user_id', $user->id)
                    ->where('date', $date)
                    ->where('promotes_to_workday', true)
                    ->exists();

                if (! $hasPromotion) {
                    $validator->errors()->add(
                        'date',
                        'Training cannot be scheduled on a rest day. Set a shift override that promotes the day to a work day first.'
                    );
                }
            }
        });
    }
}
