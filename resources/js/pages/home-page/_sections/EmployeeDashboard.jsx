import React from 'react';
import { Clock, DollarSign, CalendarCheck, Users } from 'lucide-react';
import { useGetTodayQuery } from '@/features/timekeeping/timelogApi';
import { useGetMyScheduleQuery } from '@/features/timekeeping/scheduleApi';
import { useGetEmployeeKpisQuery } from '@/features/dashboard/dashboardApi';
import ClockWidget from './ClockWidget';
import TodayTimeline from './TodayTimeline';

function peso(val) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 2,
    }).format(val ?? 0);
}

export default function EmployeeDashboard() {
    const { data: todayData, isLoading: todayLoading } = useGetTodayQuery(undefined, {
        pollingInterval: 30000,
    });
    const { data: scheduleData } = useGetMyScheduleQuery();
    const { data: kpisData }     = useGetEmployeeKpisQuery(undefined, { pollingInterval: 60000 });

    const timelog  = todayData?.data ?? todayData ?? null;
    const schedule = scheduleData?.data ?? scheduleData ?? null;
    const kpis     = kpisData ?? null;

    const todayHours = timelog?.total_worked_minutes != null
        ? `${Math.floor(timelog.total_worked_minutes / 60)}h ${String(timelog.total_worked_minutes % 60).padStart(2, '0')}m`
        : '0h 00m';

    const attendanceRate = kpis?.attendance_rate != null
        ? `${kpis.attendance_rate}%`
        : '—';

    const attendanceSub = kpis?.total_days != null
        ? `${kpis.present_days} of ${kpis.total_days} days this month`
        : 'No data yet';

    const kpiCards = [
        {
            label: "Today's Hours",
            value: todayHours,
            sub: timelog?.status ? `Status: ${timelog.status.replace('_', ' ')}` : 'Not clocked in',
            icon: Clock,
            light: 'bg-indigo-50',
            text: 'text-indigo-600',
        },
        {
            label: 'Monthly Earnings',
            value: kpis ? peso(kpis.monthly_earnings) : '—',
            sub: kpis?.monthly_earnings > 0 ? 'Released payslips this month' : 'No released payslips yet',
            icon: DollarSign,
            light: 'bg-emerald-50',
            text: 'text-emerald-600',
        },
        {
            label: 'Attendance Rate',
            value: attendanceRate,
            sub: attendanceSub,
            icon: CalendarCheck,
            light: 'bg-violet-50',
            text: 'text-violet-600',
        },
        {
            label: 'Team Online',
            value: kpis ? String(kpis.team_online) : '—',
            sub: kpis?.team_online === 1 ? '1 teammate active today' : `${kpis?.team_online ?? 0} teammates active today`,
            icon: Users,
            light: 'bg-sky-50',
            text: 'text-sky-600',
        },
    ];

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpiCards.map(({ label, value, sub, icon: Icon, light, text }) => (
                    <div
                        key={label}
                        className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                    >
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${light}`}>
                            <Icon size={22} className={text} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
                            <p className="text-xs text-slate-400">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Timekeeping widgets */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ClockWidget
                    timelog={timelog}
                    schedule={schedule}
                    isLoading={todayLoading}
                />
                <TodayTimeline
                    timelog={timelog}
                    isLoading={todayLoading}
                />
            </div>
        </div>
    );
}
