import React, { useState, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { Select } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetCalendarQuery } from '@/features/timekeeping/attendanceApi';
import { useGetTimesheetSubjectsQuery } from '@/features/timekeeping/timesheetApi';
import AttendanceCalendar from './_sections/AttendanceCalendar';
import DayDetailModal from './_sections/DayDetailModal';
import CorrectionQueueTable from './_sections/CorrectionQueueTable';

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'team_lead'];

function monthLabel(year, month) {
    return new Date(year, month - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export default function AttendancePage() {
    const { props }  = usePage();
    const authUser   = props.auth?.user;
    const userRoles  = authUser?.roles ?? [];
    const isManager  = userRoles.some((r) => MANAGER_ROLES.includes(r));
    const isAdmin    = userRoles.some((r) => ['super_admin', 'admin'].includes(r));

    const now = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [selectedUserId, setSelectedUserId] = useState(authUser?.id ?? null);
    const [selectedDay, setSelectedDay]       = useState(null);
    const [modalOpen, setModalOpen]           = useState(false);

    // Can file only when viewing your own attendance AND you hold a filing role
    const canFile    = selectedUserId === authUser?.id &&
                       userRoles.some((r) => ['employee', 'team_lead', 'manager'].includes(r));

    const monthParam = `${year}-${String(month).padStart(2, '0')}`;

    // Subjects dropdown — same endpoint as Timesheets
    const { data: subjectsData } = useGetTimesheetSubjectsQuery(undefined, { skip: !isManager });

    const { data: calendarData, isLoading } = useGetCalendarQuery({
        month: monthParam,
        userId: selectedUserId,
    });

    const days     = calendarData?.data ?? [];
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

    function prevMonth() {
        if (month === 1) { setYear((y) => y - 1); setMonth(12); }
        else             { setMonth((m) => m - 1); }
    }

    function nextMonth() {
        if (month === 12) { setYear((y) => y + 1); setMonth(1); }
        else              { setMonth((m) => m + 1); }
    }

    function handleDayClick(day) {
        setSelectedDay(day);
        setModalOpen(true);
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Daily presence tracking. Click any past day to view details or file a correction.
                </p>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Month nav */}
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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

            {/* Calendar card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <AttendanceCalendar
                    days={days}
                    year={year}
                    month={month}
                    isLoading={isLoading}
                    onDayClick={handleDayClick}
                />
            </div>

            {/* Day detail modal */}
            <DayDetailModal
                day={selectedDay}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                canFile={canFile}
                isAdmin={isAdmin}
                isManager={isManager}
                targetUserId={selectedUserId}
            />

            {/* Correction queue — managers only */}
            {isManager && <CorrectionQueueTable />}
        </div>
    );
}

AttendancePage.layout = (page) => (
    <MainLayout title="Attendance">{page}</MainLayout>
);
