import React, { useState, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { Select } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetTimesheetDataQuery, useGetTimesheetSubjectsQuery } from '@/features/timekeeping/timesheetApi';
import TimesheetSummaryCards from './_sections/TimesheetSummaryCards';
import WeeklyGrid from './_sections/WeeklyGrid';

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'team_lead'];

function monthLabel(year, month) {
    return new Date(year, month - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export default function TimesheetsPage() {
    const { props }   = usePage();
    const authUser    = props.auth?.user;
    const userRoles   = authUser?.roles ?? [];
    const isManager   = userRoles.some((r) => MANAGER_ROLES.includes(r));

    const now = new Date();
    const [year,  setYear]           = useState(now.getFullYear());
    const [month, setMonth]          = useState(now.getMonth() + 1); // 1-based
    const [selectedUserId, setSelectedUserId] = useState(authUser?.id ?? null);

    const monthParam = `${year}-${String(month).padStart(2, '0')}`;

    // Only fetch subject list for managers / team leads
    const { data: subjectsData } = useGetTimesheetSubjectsQuery(undefined, {
        skip: !isManager,
    });

    const { data: timesheetData, isLoading } = useGetTimesheetDataQuery({
        month: monthParam,
        userId: selectedUserId,
    });

    const logs     = timesheetData?.data ?? [];
    const subjects = subjectsData?.data  ?? [];

    // Ensure the current user is always in the options list (team_lead subjects
    // only include team members, not themselves, so the initial value would
    // render as a raw ID without this guard).
    const subjectOptions = useMemo(() => {
        const list = subjects.map((s) => ({ value: s.id, label: s.name }));
        if (authUser && !list.some((o) => o.value === authUser.id)) {
            list.unshift({ value: authUser.id, label: authUser.name ?? 'Me' });
        }
        return list;
    }, [subjects, authUser]);

    /* ── Month navigation ─────────────────────────────────────────────── */
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    function prevMonth() {
        if (month === 1) { setYear((y) => y - 1); setMonth(12); }
        else             { setMonth((m) => m - 1); }
    }

    function nextMonth() {
        if (isCurrentMonth) return;
        if (month === 12) { setYear((y) => y + 1); setMonth(1); }
        else              { setMonth((m) => m + 1); }
    }

    /* ── Render ───────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">Timesheets</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Weekly breakdown of hours worked per employee.
                </p>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Month navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <span className="min-w-[150px] text-center text-sm font-semibold text-slate-700">
                        {monthLabel(year, month)}
                    </span>
                    <button
                        onClick={nextMonth}
                        disabled={isCurrentMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Next month"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>

                {/* Employee selector — managers/team leads only */}
                {isManager && subjects.length > 0 && (
                    <Select
                        showSearch
                        placeholder="Select employee"
                        value={selectedUserId}
                        onChange={setSelectedUserId}
                        options={subjectOptions}
                        filterOption={(input, opt) =>
                            opt.label.toLowerCase().includes(input.toLowerCase())
                        }
                        style={{ width: 220 }}
                        aria-label="Select employee"
                    />
                )}
            </div>

            {/* Summary cards */}
            <TimesheetSummaryCards logs={logs} isLoading={isLoading} />

            {/* Weekly grid card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-sm font-semibold text-slate-800">Weekly Breakdown</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Mon – Sun view · times shown in clock-in order
                    </p>
                </div>
                <WeeklyGrid
                    logs={logs}
                    year={year}
                    month={month}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}

TimesheetsPage.layout = (page) => (
    <MainLayout title="Timesheets">{page}</MainLayout>
);
