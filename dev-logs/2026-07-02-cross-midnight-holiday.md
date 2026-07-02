# Cross-Midnight Holiday Pay Fix — 2026-07-02

## Summary

Fixed a payroll computation bug where employees working a shift that crosses midnight into a Philippine public holiday received zero holiday premium for the post-midnight portion. Similarly, shifts starting on a holiday but ending after midnight were over-paying by applying a full-day holiday rate regardless of how many hours were actually worked on the holiday.

---

## Root Cause

`PayslipComputationService::compute()` checked only the `date` column of the `TimeLog` record to determine if a holiday premium applied. A shift logged on Friday (date = `$fri`) that crossed midnight into Saturday (a regular holiday) had `$holiday = null` because `$fri` was not a holiday, so **zero premium was paid** for the 3+ hours worked on Saturday.

Conversely, a shift logged on Friday (a holiday) that ran past midnight into normal Saturday received the **full-day** `computeHolidayExtra()` rate (i.e., 100% of daily rate) even though only part of the shift fell on the holiday.

---

## Files Changed

### `app/Services/PayslipComputationService.php`

**Change 1 — `$logs` initialization (groupBy + OT aggregation)**

Replaced `keyBy('date')` with `groupBy` + `map` so that if a future migration ever allows multiple partial-day rows for one user-date, overtime minutes are summed correctly. Current DB unique constraint (`UNIQUE['user_id', 'date']`) makes this defensive; it is not harmful.

**Change 2 — New helper: `computeHolidayExtraMinutes()`**

Added after `computeHolidayExtra()`:

```php
public function computeHolidayExtraMinutes(
    float $dailyRate, string $holidayType, bool $worked, int $minutes
): float {
    if ($minutes <= 0 || !$worked) return 0.0;
    $multiplier = match ($holidayType) {
        'regular' => 1.0,
        'special' => 0.30,
        default   => 0.0,
    };
    return round(($dailyRate / 8.0) * $multiplier * ($minutes / 60.0), 2);
}
```

Prorates holiday premium to an arbitrary number of minutes rather than assuming a full 8-hour day.

**Change 3 — Cross-midnight detection block**

In the `$isWorkDay` branch, replaced the simple `if ($holiday)` block with:

1. Parse raw UTC `clock_in`/`clock_out`, convert to `Asia/Manila`.
2. Detect cross-midnight (`!$clockInLocal->isSameDay($clockOutLocal)`).
3. If cross-midnight:
   - Calculate `$preMidnightMins` and `$postMidnightMins`.
   - Look up `$nextDayHoliday` for the post-midnight date.
   - Apply `computeHolidayExtraMinutes` to the pre-midnight portion if today is a holiday.
   - Apply `computeHolidayExtraMinutes` to the post-midnight portion if tomorrow is a holiday.
   - **No rest-day multiplier** on the spill — employee is completing their scheduled shift, not starting a new rest-day assignment.
4. If not cross-midnight: existing `computeHolidayExtra` (full-day) path is unchanged.

---

## Business Rules Implemented

| Scenario | Holiday Premium |
|---|---|
| Normal day → Regular Holiday (cross-midnight) | +100% on post-midnight minutes |
| Regular Holiday → Normal day (cross-midnight) | +100% on pre-midnight minutes only (prorated) |
| Normal day → Special Holiday (cross-midnight) | +30% on post-midnight minutes |
| No holidays involved | Zero — existing ND calculation unchanged |
| `flat_rate` method + cross-midnight holiday | Same premium calculation; guarantee omitted (half-month base already covers it) |

---

## QA Script

**`scripts/qa_cross_midnight.php`**

Runs inside a `DB::transaction()` that always rolls back — leaves no data behind.

| Test | Description | Result |
|---|---|---|
| TC-UNIT-01 | `computeHolidayExtraMinutes` regular 3h → ₱511.36 | ✓ |
| TC-UNIT-02 | regular 6h → ₱1,022.73 | ✓ |
| TC-UNIT-03 | special 3h → ₱153.41 | ✓ |
| TC-UNIT-04 | not worked → 0.0 | ✓ |
| TC-UNIT-05 | zero minutes → 0.0 | ✓ |
| TC-OVL-01 | Fri 18:00→Sat 03:00, Sat = Regular Holiday; HOLIDAY_PAY ≈ ₱1,875 | ✓ |
| TC-OVL-02 | Fri 18:00→Sat 03:00, Fri = Regular Holiday; HOLIDAY_PAY ≈ ₱1,022.73 (prorated 6h) | ✓ |
| TC-OVL-03 | Thu 22:00→Fri 06:00 + Fri 08:00→17:00, Fri = Regular Holiday; tail contributes | ✓ |
| TC-OVL-04 | Fri 18:00→Sat 03:00, Sat = Special Holiday; HOLIDAY_PAY ≈ ₱153.41 | ✓ |
| TC-OVL-05 | Fri 18:00→Sat 03:00, no holidays; ND = 300 min, no HOLIDAY_PAY | ✓ |
| TC-OVL-06 | Same scenario under `flat_rate`; premium ≈ ₱511.36 (no guarantee) | ✓ |

**Total: 21/21 passed**

---

## Notes

- Test week uses 2027-03-05 (Fri) / 2027-03-06 (Sat) to avoid conflicts with pre-seeded 2026 holidays.
- `TimeLog` has `UNIQUE(['user_id', 'date'])` — one log per user per calendar date; the groupBy OT aggregation is therefore defensive.
- Cross-midnight detection relies on `APP_LOCAL_TIMEZONE` (Asia/Manila). If the timezone config changes, re-run the QA script.
