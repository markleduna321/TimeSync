<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'date', 'clock_in', 'clock_out',
        'lunch_start', 'lunch_end', 'breaks', 'status',
        'overtime_minutes', 'effective_shift_start', 'effective_shift_end',
    ];

    protected $casts = [
        'date'        => 'date',
        'clock_in'    => 'datetime',
        'clock_out'   => 'datetime',
        'lunch_start' => 'datetime',
        'lunch_end'   => 'datetime',
        'breaks'      => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getTotalWorkedMinutesAttribute(): ?int
    {
        if (! $this->clock_in) {
            return null;
        }
        $end   = $this->clock_out ?? now();
        $total = $this->clock_in->diffInMinutes($end);

        if ($this->lunch_start && $this->lunch_end) {
            $total -= $this->lunch_start->diffInMinutes($this->lunch_end);
        }

        foreach ($this->breaks ?? [] as $break) {
            if (! empty($break['start']) && ! empty($break['end'])) {
                $total -= Carbon::parse($break['start'])->diffInMinutes(Carbon::parse($break['end']));
            }
        }

        return max(0, $total);
    }
}
