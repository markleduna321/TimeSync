import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { usePage } from '@inertiajs/react';
import { Clock, DollarSign, CalendarCheck, Users, ShieldOff } from 'lucide-react';
import { useGetTodayQuery } from '@/features/timekeeping/timelogApi';
import { useGetMyScheduleQuery } from '@/features/timekeeping/scheduleApi';
import ClockWidget from './_sections/ClockWidget';
import TodayTimeline from './_sections/TodayTimeline';

export default function DashboardPage() {
    const { props }    = usePage();
    const isEmployee   = props.auth?.user?.roles?.includes('employee') ?? false;

    const { data: todayData, isLoading: todayLoading } = useGetTodayQuery(undefined, {
        pollingInterval: 30000, // re-fetch every 30 s to keep KPIs fresh
    });
    const { data: scheduleData } = useGetMyScheduleQuery();

    const timelog  = todayData?.data ?? todayData ?? null;
    const schedule = scheduleData?.data ?? scheduleData ?? null;

    // Live KPI values derived from the API response
    const todayHours = timelog?.total_worked_minutes != null
        ? `${Math.floor(timelog.total_worked_minutes / 60)}h ${String(timelog.total_worked_minutes % 60).padStart(2, '0')}m`
        : '0h 00m';

    const kpiCards = [
        {
            label: "Today's Hours",
            value: todayHours,
            sub: timelog?.status ? `Status: ${timelog.status.replace('_', ' ')}` : 'Not clocked in',
            icon: Clock,
            color: 'bg-indigo-500',
            light: 'bg-indigo-50',
            text: 'text-indigo-600',
        },
        {
            label: 'Weekly Earnings',
            value: '₱0.00',
            sub: 'This week',
            icon: DollarSign,
            color: 'bg-emerald-500',
            light: 'bg-emerald-50',
            text: 'text-emerald-600',
        },
        {
            label: 'Attendance Rate',
            value: '—',
            sub: 'No data yet',
            icon: CalendarCheck,
            color: 'bg-violet-500',
            light: 'bg-violet-50',
            text: 'text-violet-600',
        },
        {
            label: 'Team Online',
            value: '0',
            sub: 'Members active',
            icon: Users,
            color: 'bg-sky-500',
            light: 'bg-sky-50',
            text: 'text-sky-600',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                    Welcome back — here's what's happening today.
                </p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpiCards.map(({ label, value, sub, icon: Icon, color, light, text }) => (
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

            {/* Timekeeping widgets — employees only */}
            {isEmployee ? (
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
            ) : (
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                        <ShieldOff size={22} className="text-slate-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-700">Time tracking not available</p>
                        <p className="mt-0.5 text-sm text-slate-400">Clock-in is only available for users with the Employee role.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

DashboardPage.layout = (page) => (
    <MainLayout title="Dashboard">{page}</MainLayout>
);

