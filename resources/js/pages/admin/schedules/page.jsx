import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetUsersWithSchedulesQuery } from '@/features/timekeeping/scheduleApi';
import ScheduleTable from './_sections/ScheduleTable';
import ScheduleFormModal from './_sections/ScheduleFormModal';

export default function AdminSchedulesPage() {
    const [page, setPage]             = useState(1);
    const [modalOpen, setModalOpen]   = useState(false);
    const [targetUser, setTargetUser] = useState(null);

    const { data, isLoading } = useGetUsersWithSchedulesQuery({ page });

    const users = data?.data ?? [];
    const meta  = data?.meta ?? {};

    function openAssign(user) {
        setTargetUser(user);
        setModalOpen(true);
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Schedules</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Assign and manage work schedules for each employee.
                    </p>
                </div>
            </div>

            {/* Table card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <ScheduleTable
                    users={users}
                    meta={meta}
                    isLoading={isLoading}
                    page={page}
                    onPageChange={setPage}
                    onAssign={openAssign}
                />
            </div>

            {/* Assign / Edit modal */}
            <ScheduleFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                targetUser={targetUser}
            />
        </div>
    );
}

AdminSchedulesPage.layout = (page) => (
    <MainLayout title="Schedules">{page}</MainLayout>
);
