<?php

namespace Database\Seeders;

use App\Models\AttendanceCorrection;
use App\Models\Role;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AttendanceSeeder extends Seeder
{
    /**
     * Seed test users, schedules, time logs, and corrections.
     *
     * Scenarios covered:
     *   - Standard Mon–Fri 08:00–17:00 schedule (most users)
     *   - Shift schedule: Mon–Sat 09:00–18:00 (one employee)
     *   - Present (on-time clock-in), Late (>15 min grace), Absent (no log on workday)
     *   - Weekend / rest-day (no log needed)
     *   - Corrections: pending, approved, rejected
     */
    public function run(): void
    {
        // ── Roles ─────────────────────────────────────────────────────────
        $roleManager  = Role::where('slug', 'manager')->first();
        $roleTeamLead = Role::where('slug', 'team_lead')->first();
        $roleEmployee = Role::where('slug', 'employee')->first();

        // ── Users ─────────────────────────────────────────────────────────
        $manager = User::updateOrCreate(
            ['email' => 'manager@test.com'],
            ['name' => 'Maria Manager', 'password' => Hash::make('password')]
        );

        $teamLead = User::updateOrCreate(
            ['email' => 'teamlead@test.com'],
            ['name' => 'Tom TeamLead', 'password' => Hash::make('password')]
        );

        $emp1 = User::updateOrCreate(
            ['email' => 'alice@test.com'],
            ['name' => 'Alice Employee', 'password' => Hash::make('password')]
        );

        $emp2 = User::updateOrCreate(
            ['email' => 'bob@test.com'],
            ['name' => 'Bob Employee', 'password' => Hash::make('password')]
        );

        // Shift worker — Mon–Sat, late shift
        $emp3 = User::updateOrCreate(
            ['email' => 'charlie@test.com'],
            ['name' => 'Charlie ShiftWorker', 'password' => Hash::make('password')]
        );

        // Assign roles
        if ($roleManager)  { $manager->roles()->syncWithoutDetaching([$roleManager->id]);  }
        if ($roleTeamLead) { $teamLead->roles()->syncWithoutDetaching([$roleTeamLead->id]); }
        if ($roleEmployee) {
            foreach ([$emp1, $emp2, $emp3] as $emp) {
                $emp->roles()->syncWithoutDetaching([$roleEmployee->id]);
            }
        }

        // ── Schedules ─────────────────────────────────────────────────────
        $standardDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        $shiftDays    = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        foreach ([$manager, $teamLead, $emp1, $emp2] as $user) {
            Schedule::updateOrCreate(
                ['user_id' => $user->id],
                ['work_days' => $standardDays, 'shift_start' => '08:00', 'shift_end' => '17:00']
            );
        }

        Schedule::updateOrCreate(
            ['user_id' => $emp3->id],
            ['work_days' => $shiftDays, 'shift_start' => '09:00', 'shift_end' => '18:00']
        );

        // ── Time Logs — past 60 days ───────────────────────────────────────
        // We build logs for each user according to scenario patterns below.
        $today = Carbon::today();
        $start = $today->copy()->subDays(60);

        foreach ([$manager, $teamLead, $emp1, $emp2, $emp3] as $user) {
            $schedule  = Schedule::where('user_id', $user->id)->first();
            $workDays  = $schedule->work_days;   // ['monday', ...]
            $shiftHour = (int) explode(':', $schedule->shift_start)[0];
            $shiftMin  = (int) explode(':', $schedule->shift_start)[1];
            $endHour   = (int) explode(':', $schedule->shift_end)[0];

            $cursor = $start->copy();
            $dayCounter = 0;

            while ($cursor->lt($today)) {
                $dayName = strtolower($cursor->englishDayOfWeek);

                if (! in_array($dayName, $workDays)) {
                    $cursor->addDay();
                    $dayCounter++;
                    continue;
                }

                // Decide scenario based on day counter to get a realistic spread:
                // 10% absent, 20% late, 70% present
                $scenario = $this->scenario($dayCounter, $user->id);

                if ($scenario === 'absent') {
                    $cursor->addDay();
                    $dayCounter++;
                    continue;
                }

                // Build clock-in time
                if ($scenario === 'late') {
                    // 20–90 minutes late
                    $lateMinutes = rand(20, 90);
                    $clockIn = $cursor->copy()->setTime($shiftHour, $shiftMin)->addMinutes($lateMinutes);
                } else {
                    // On time: 0–14 minutes early or within grace
                    $earlyMinutes = rand(-10, 14);
                    $clockIn = $cursor->copy()->setTime($shiftHour, $shiftMin)->addMinutes($earlyMinutes);
                }

                // Clock out: shift_end + rand(-10, +30) minutes
                $clockOut = $cursor->copy()->setTime($endHour, 0)->addMinutes(rand(-10, 30));

                // Lunch: 30–60 min window around noon
                $lunchStart = $cursor->copy()->setTime(12, rand(0, 15));
                $lunchEnd   = $lunchStart->copy()->addMinutes(rand(30, 60));

                TimeLog::updateOrCreate(
                    ['user_id' => $user->id, 'date' => $cursor->toDateString()],
                    [
                        'clock_in'    => $clockIn,
                        'clock_out'   => $clockOut,
                        'lunch_start' => $lunchStart,
                        'lunch_end'   => $lunchEnd,
                        'breaks'      => null,
                        'status'      => 'clocked_out',
                    ]
                );

                $cursor->addDay();
                $dayCounter++;
            }
        }

        // ── Attendance Corrections ─────────────────────────────────────────
        $adminUser = User::where('email', 'admin@gmail.com')->first();

        // 1. Pending correction — Alice filed yesterday
        $this->correction($emp1, $today->copy()->subDays(1), 'pending', null, $adminUser);

        // 2. Approved correction — Bob filed 3 days ago, admin approved
        $this->correction($emp2, $today->copy()->subDays(3), 'approved', 'Looks good, approved.', $adminUser);

        // 3. Rejected correction — Bob filed 7 days ago, manager rejected
        $this->correction($emp2, $today->copy()->subDays(7), 'rejected', 'Could not verify the claim.', $manager);

        // 4. Pending correction — Charlie filed 2 days ago
        $this->correction($emp3, $today->copy()->subDays(2), 'pending', null, $adminUser);

        // 5. Pending correction — TeamLead filed 5 days ago (absent day — no log)
        $this->correction($teamLead, $today->copy()->subDays(5), 'pending', null, $adminUser);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /**
     * Deterministic scenario selection based on day+user offset.
     * Returns 'present' | 'late' | 'absent'
     */
    private function scenario(int $dayCounter, int $userId): string
    {
        $seed = ($dayCounter + $userId) % 10;
        if ($seed === 0)          return 'absent';   // 10%
        if ($seed === 3 || $seed === 7) return 'late'; // 20%
        return 'present';                             // 70%
    }

    /**
     * Create (or skip if exists) an attendance correction for a user on a given date.
     * If status is absent on that date, ensure no TimeLog exists.
     */
    private function correction(
        User   $user,
        Carbon $date,
        string $status,
        ?string $adminNote,
        ?User  $reviewer
    ): void {
        // Ensure the date is a past workday (skip if it already has a log and we want "absent" scenario)
        // We'll just delete any existing log so the calendar shows "absent" + "pending correction"
        TimeLog::where('user_id', $user->id)->where('date', $date->toDateString())->delete();

        AttendanceCorrection::updateOrCreate(
            ['user_id' => $user->id, 'date' => $date->toDateString()],
            [
                'reason'               => 'System error prevented me from clocking in on time. I was present but the terminal was offline.',
                'proof_path'           => null,
                'requested_clock_in'   => '08:05',
                'requested_clock_out'  => '17:00',
                'status'               => $status,
                'reviewed_by'          => ($status !== 'pending' && $reviewer) ? $reviewer->id : null,
                'reviewed_at'          => $status !== 'pending' ? now() : null,
                'admin_note'           => $adminNote,
            ]
        );
    }
}
