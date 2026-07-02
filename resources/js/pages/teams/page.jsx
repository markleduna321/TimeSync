import React, { useState } from "react";
import MainLayout from "@/Layouts/MainLayout";
import { usePage } from "@inertiajs/react";
import { Users } from "lucide-react";
import { Modal } from "antd";
import { useGetTeamsQuery, useDeleteTeamMutation } from "@/features/teams/teamsApi";
import { useGetUsersQuery } from "@/features/users/usersApi";
import TeamTable from "./_sections/TeamTable";
import TeamFormModal from "./_sections/TeamFormModal";
import TeamMembersModal from "./_sections/TeamMembersModal";

const ADMIN_ROLES   = ["super_admin", "admin"];
const MANAGER_ROLES = ["manager"];

export default function TeamsPage() {
    const { props }  = usePage();
    const authUser   = props.auth?.user;
    const userRoles  = authUser?.roles ?? [];
    const canCreate     = userRoles.some((r) => ADMIN_ROLES.includes(r));
    const canManageOwn  = !canCreate && userRoles.some((r) => MANAGER_ROLES.includes(r));

    const [page, setPage]               = useState(1);
    const [modalOpen, setModalOpen]     = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [viewingTeam, setViewingTeam] = useState(null);
    const [viewOpen, setViewOpen]       = useState(false);

    const { data, isLoading }          = useGetTeamsQuery({ page });
    const { data: usersData }          = useGetUsersQuery({ per_page: 200 }, { skip: !canCreate && !canManageOwn });
    const [deleteTeam, { isLoading: deleting }] = useDeleteTeamMutation();

    const teams = data?.data ?? [];
    const meta  = data?.meta ?? {};
    const users = usersData?.data ?? [];

    const teamLeadUsers = users.filter((u) =>
        u.roles?.some((r) => r.slug === "team_lead")
    );
    const managerUsers = users.filter((u) =>
        u.roles?.some((r) => r.slug === "manager")
    );

    function openCreate() {
        setEditingTeam(null);
        setModalOpen(true);
    }

    function openEdit(team) {
        // Manager can only edit their own team
        if (canManageOwn && team.manager_id !== authUser?.id) return;
        setEditingTeam(team);
        setModalOpen(true);
    }

    function openView(team) {
        setViewingTeam(team);
        setViewOpen(true);
    }

    function confirmDelete(team) {
        Modal.confirm({
            title: "Delete Team",
            content: `Permanently delete "${team.name}"? Members will be unassigned but not deleted.`,
            okText: "Delete",
            okButtonProps: { danger: true, loading: deleting },
            cancelText: "Cancel",
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
                {canCreate && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                        <Users size={15} />
                        New Team
                    </button>
                )}
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
                    onView={openView}
                    canCreate={canCreate}
                    canManageOwn={canManageOwn}
                    authUserId={authUser?.id}
                />
            </div>

            {/* Create / Edit modal */}
            {(canCreate || canManageOwn) && (
                <TeamFormModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    editingTeam={editingTeam}
                    teamLeadUsers={teamLeadUsers}
                    managerUsers={managerUsers}
                    allUsers={users}
                    isManagerMode={canManageOwn}
                />
            )}

            {/* View Members modal */}
            <TeamMembersModal
                team={viewingTeam}
                open={viewOpen}
                onClose={() => setViewOpen(false)}
            />
        </div>
    );
}

TeamsPage.layout = (page) => (
    <MainLayout title="Teams" children={page} />
);
