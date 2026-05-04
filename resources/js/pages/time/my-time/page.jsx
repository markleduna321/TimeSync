import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetTodayQuery, useGetHistoryQuery } from '@/features/timekeeping/timelogApi';
import { useGetMyScheduleQuery } from '@/features/timekeeping/scheduleApi';
import ClockWidget from '@/pages/home-page/_sections/ClockWidget';
import TimeHistoryTable from './_sections/TimeHistoryTable';

function monthLabel(year, month) {
    return new Date(year, month - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export default function MyTimePage() {
    const now = new Date();
    const [year, setYear]   = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
    const [historyPage, setHistoryPage] = useState(1);

    const monthParam = `${year}-${String(month).padStart(2, '0')}`;

    const { data: todayData, isLoading: todayLoading } = useGetTodayQuery(undefined, {
        pollingInterval: 30000,
    });
    const { data: scheduleData } = useGetMyScheduleQuery();
    const { data: historyData, isLoading: historyLoading } = useGetHistoryQuery(
        { month: monthParam, page: historyPage },
    );

    const timelog  = todayData?.data ?? todayData ?? null;
    const schedule = scheduleData?.data ?? scheduleData ?? null;
    const logs     = historyData?.data ?? [];
    const meta     = historyData?.meta ?? {};

    function prevMonth() {
        if (month === 1) { setYear((y) => y - 1); setMonth(12); }
        else { setMonth((m) => m - 1); }
        setHistoryPage(1);
    }

    function nextMonth() {
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
        if (isCurrentMonth) return; // can't go into the future
        if (month === 12) { setYear((y) => y + 1); setMonth(1); }
        else { setMonth((m) => m + 1); }
        setHistoryPage(1);
    }

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">My Time</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Track your daily hours and review your time history.
                </p>
            </div>

            {/* Clock widget */}
            <ClockWidget
                timelog={timelog}
                schedule={schedule}
                isLoading={todayLoading}
            />

            {/* History card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                {/* History header with month nav */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="text-sm font-semibold text-slate-800">Time History</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevMonth}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="min-w-[130px] text-center text-sm font-medium text-slate-700">
                            {monthLabel(year, month)}
                        </span>
                        <button
                            onClick={nextMonth}
                            disabled={isCurrentMonth}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Next month"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>

                <TimeHistoryTable
                    logs={logs}
                    meta={meta}
                    isLoading={historyLoading}
                    page={historyPage}
                    onPageChange={setHistoryPage}
                />
            </div>
        </div>
    );
}

MyTimePage.layout = (page) => (
    <MainLayout title="My Time">{page}</MainLayout>
);
