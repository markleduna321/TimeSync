import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { UserPlus } from 'lucide-react';
import { Modal } from 'antd';
import { useGetUsersQuery, useDeleteUserMutation } from '@/features/users/usersApi';
import UserTable from './_sections/UserTable';
import UserFormModal from './_sections/UserFormModal';
import UserEditModal from './_sections/UserEditModal';

export default function AdminUsersPage() {
    const [page, setPage]               = useState(1);
    const [createOpen, setCreateOpen]   = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const { data, isLoading } = useGetUsersQuery({ page });
    const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

    const users = data?.data ?? [];
    const meta  = data?.meta ?? {};

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
                        Manage accounts, roles, schedules, and benefits.
                    </p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <UserPlus size={15} />
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
                    onEdit={setEditingUser}
                    onDelete={confirmDelete}
                />
            </div>

            {/* Create modal (simple: name, email, password, salary, roles) */}
            <UserFormModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
            />

            {/* Edit modal (full tabbed profile hub) */}
            <UserEditModal
                open={!!editingUser}
                onClose={() => setEditingUser(null)}
                user={editingUser}
            />
        </div>
    );
}

AdminUsersPage.layout = (page) => (
    <MainLayout title="Users" children={page} />
);
