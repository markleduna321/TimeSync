import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Users } from 'lucide-react';
import { Modal } from 'antd';
import { useGetTeamsQuery, useDeleteTeamMutation } from '@/features/teams/teamsApi';
import { useGetUsersQuery } from '@/features/users/usersApi';
import TeamTable from './_sections/TeamTable';
import TeamFormModal from './_sections/TeamFormModal';

export default function TeamsPage() {
    const [page, setPage]               = useState(1);
    const [modalOpen, setModalOpen]     = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);

    const { data, isLoading }          = useGetTeamsQuery({ page });
    const { data: usersData }          = useGetUsersQuery({ per_page: 200 });
    const [deleteTeam, { isLoading: deleting }] = useDeleteTeamMutation();

    const teams = data?.data ?? [];
    const meta  = data?.meta ?? {};
    const users = usersData?.data ?? [];

    // Role-filtered subsets for dropdowns in the modal
    const teamLeadUsers = users.filter((u) =>
        u.roles?.some((r) => r.slug === 'team_lead')
    );
    const managerUsers = users.filter((u) =>
        u.roles?.some((r) => r.slug === 'manager')
    );

    function openCreate() {
        setEditingTeam(null);
        setModalOpen(true);
    }

    function openEdit(team) {
        setEditingTeam(team);
        setModalOpen(true);
    }

    function confirmDelete(team) {
        Modal.confirm({
            title: 'Delete Team',
            content: `Permanently delete "${team.name}"? Members will be unassigned but not deleted.`,
            okText: 'Delete',
            okButtonProps: { danger: true, loading: deleting },
            cancelText: 'Cancel',
            onOk: () => deleteTeam(team.id),
        });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Teams</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Organise employees under team leads and managers.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <Users size={15} />
                    New Team
                </button>
            </div>

            {/* Table card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <TeamTable
                    teams={teams}
                    meta={meta}
                    isLoading={isLoading}
                    page={page}
                    onPageChange={setPage}
                    onEdit={openEdit}
                    onDelete={confirmDelete}
                />
            </div>

            {/* Create / Edit modal */}
            <TeamFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editingTeam={editingTeam}
                teamLeadUsers={teamLeadUsers}
                managerUsers={managerUsers}
                allUsers={users}
            />
        </div>
    );
}

TeamsPage.layout = (page) => (
    <MainLayout title="Teams" children={page} />
);
