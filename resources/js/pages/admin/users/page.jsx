import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Users } from 'lucide-react';
import { Modal } from 'antd';
import { useGetUsersQuery, useDeleteUserMutation } from '@/features/users/usersApi';
import { useGetRolesQuery } from '@/features/roles/rolesApi';
import UserTable from './_sections/UserTable';
import UserFormModal from './_sections/UserFormModal';

export default function AdminUsersPage() {
    const [page, setPage]             = useState(1);
    const [modalOpen, setModalOpen]   = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const { data, isLoading } = useGetUsersQuery({ page });
    const { data: rolesData }  = useGetRolesQuery();
    const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

    const users = data?.data ?? [];
    const meta  = data?.meta ?? {};
    const roles = rolesData?.data ?? rolesData ?? [];

    function openCreate() {
        setEditingUser(null);
        setModalOpen(true);
    }

    function openEdit(user) {
        setEditingUser(user);
        setModalOpen(true);
    }

    function confirmDelete(user) {
        Modal.confirm({
            title: 'Delete User',
            content: `Permanently delete "${user.name}"? This cannot be undone.`,
            okText: 'Delete',
            okButtonProps: { danger: true, loading: deleting },
            cancelText: 'Cancel',
            onOk: () => deleteUser(user.id),
        });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Users</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Manage accounts, roles, and access levels.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <Users size={15} />
                    New User
                </button>
            </div>

            {/* Table card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <UserTable
                    users={users}
                    meta={meta}
                    isLoading={isLoading}
                    page={page}
                    onPageChange={setPage}
                    onEdit={openEdit}
                    onDelete={confirmDelete}
                />
            </div>

            {/* Create / Edit modal */}
            <UserFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editingUser={editingUser}
                roles={roles}
            />
        </div>
    );
}

AdminUsersPage.layout = (page) => (
    <MainLayout title="Users" children={page} />
);
