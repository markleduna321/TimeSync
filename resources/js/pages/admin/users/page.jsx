import React, { useRef, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Search, UserPlus, X } from 'lucide-react';
import { Modal, Select } from 'antd';
import { usePage } from '@inertiajs/react';
import { useGetUsersQuery, useDeleteUserMutation } from '@/features/users/usersApi';
import { useGetDepartmentsQuery } from '@/features/organization/organizationApi';
import UserTable from './_sections/UserTable';
import UserFormModal from './_sections/UserFormModal';
import UserEditModal from './_sections/UserEditModal';

const ALL_ROLE_OPTIONS = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin',       label: 'Admin' },
    { value: 'manager',     label: 'Manager' },
    { value: 'team_lead',   label: 'Team Lead' },
    { value: 'employee',    label: 'Employee' },
];

export default function AdminUsersPage() {
    const { props } = usePage();
    const isSuperAdmin = (props.auth?.user?.roles ?? []).includes('super_admin');

    const ROLE_OPTIONS = isSuperAdmin
        ? ALL_ROLE_OPTIONS
        : ALL_ROLE_OPTIONS.filter((r) => r.value !== 'super_admin');

    const [page, setPage]               = useState(1);
    const [createOpen, setCreateOpen]   = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Filter state
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]           = useState('');
    const [roleFilter, setRoleFilter]   = useState(null);
    const [deptFilter, setDeptFilter]   = useState(null);
    const debounceRef = useRef(null);

    const { data: deptData } = useGetDepartmentsQuery({ active_only: 1 });
    const deptOptions = (deptData?.data ?? []).map((d) => ({ value: d.id, label: d.name }));

    const hasFilters = !!(search || roleFilter || deptFilter);

    function handleSearchInput(e) {
        const val = e.target.value;
        setSearchInput(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(val);
            setPage(1);
        }, 350);
    }

    function handleRoleChange(val) {
        setRoleFilter(val ?? null);
        setPage(1);
    }

    function handleDeptChange(val) {
        setDeptFilter(val ?? null);
        setPage(1);
    }

    function clearFilters() {
        setSearchInput('');
        setSearch('');
        setRoleFilter(null);
        setDeptFilter(null);
        setPage(1);
    }

    const queryParams = { page };
    if (search)     queryParams.search        = search;
    if (roleFilter) queryParams.role          = roleFilter;
    if (deptFilter) queryParams.department_id = deptFilter;

    const { data, isLoading } = useGetUsersQuery(queryParams);
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

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={handleSearchInput}
                            placeholder="Search name or email…"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                        />
                    </div>

                    {/* Role filter */}
                    <Select
                        placeholder="All Roles"
                        value={roleFilter}
                        onChange={handleRoleChange}
                        options={ROLE_OPTIONS}
                        allowClear
                        style={{ minWidth: 140 }}
                    />

                    {/* Department filter */}
                    <Select
                        placeholder="All Departments"
                        value={deptFilter}
                        onChange={handleDeptChange}
                        options={deptOptions}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        style={{ minWidth: 170 }}
                    />

                    {/* Clear filters */}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                        >
                            <X size={12} />
                            Clear
                        </button>
                    )}

                    {/* Result count */}
                    {meta?.total !== undefined && (
                        <span className="ml-auto text-xs text-slate-400">
                            {meta.total} {meta.total === 1 ? 'user' : 'users'}
                        </span>
                    )}
                </div>

                <UserTable
                    users={users}
                    meta={meta}
                    isLoading={isLoading}
                    page={page}
                    onPageChange={setPage}
                    onEdit={setEditingUser}
                    onDelete={confirmDelete}
                    hasFilters={hasFilters}
                />
            </div>

            {/* Create modal (simple: name, email, password, salary, roles) */}
            <UserFormModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={() => {
                    // Close the modal and clear any active filters so the
                    // invalidated list refetches without search/role/dept
                    // params — ensuring the new user is always visible.
                    setCreateOpen(false);
                    clearFilters();
                }}
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
