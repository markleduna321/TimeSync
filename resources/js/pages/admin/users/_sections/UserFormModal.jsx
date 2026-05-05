import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { useCreateUserMutation } from '@/features/users/usersApi';
import { useGetRolesQuery } from '@/features/roles/rolesApi';

const DEFAULT_FORM = { name: '', email: '', password: '', monthly_salary: '', roles: [] };

const ROLE_COLORS = {
    super_admin: 'text-purple-700',
    admin:       'text-red-600',
    manager:     'text-orange-600',
    team_lead:   'text-blue-600',
    employee:    'text-slate-600',
};

export default function UserFormModal({ open, onClose }) {
    const [form, setForm]     = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});

    const [createUser, { isLoading }] = useCreateUserMutation();
    const { data: rolesData } = useGetRolesQuery();
    const roles = rolesData?.data ?? rolesData ?? [];

    useEffect(() => {
        if (open) {
            setForm(DEFAULT_FORM);
            setErrors({});
        }
    }, [open]);

    function set(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function toggleRole(roleId) {
        setForm((prev) => {
            const has = prev.roles.includes(roleId);
            return {
                ...prev,
                roles: has ? prev.roles.filter((id) => id !== roleId) : [...prev.roles, roleId],
            };
        });
    }

    async function handleSubmit() {
        setErrors({});
        try {
            await createUser({
                name:           form.name,
                email:          form.email,
                password:       form.password,
                monthly_salary: form.monthly_salary || null,
                roles:          form.roles,
            }).unwrap();
            onClose();
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    return (
        <Modal
            open={open}
            title={<span className="font-semibold text-slate-800">New User</span>}
            onCancel={onClose}
            onOk={handleSubmit}
            okText="Create User"
            okButtonProps={{ loading: isLoading, className: 'bg-indigo-600 hover:bg-indigo-700' }}
            cancelButtonProps={{ disabled: isLoading }}
            destroyOnHidden
        >
            <div className="mt-4 space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="u-name">
                        Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="u-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        placeholder="Jane Doe"
                        disabled={isLoading}
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name[0]}</p>}
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="u-email">
                        Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="u-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        placeholder="jane@example.com"
                        disabled={isLoading}
                    />
                    {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email[0]}</p>}
                </div>

                {/* Password */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="u-pass">
                        Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="u-pass"
                        type="password"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.password ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        placeholder="Min. 8 characters"
                        disabled={isLoading}
                    />
                    {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password[0]}</p>}
                </div>

                {/* Monthly Salary */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="u-salary">
                        Monthly Salary (₱)
                    </label>
                    <input
                        id="u-salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.monthly_salary}
                        onChange={(e) => set('monthly_salary', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.monthly_salary ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        placeholder="e.g. 25000"
                        disabled={isLoading}
                    />
                    {errors.monthly_salary && <p className="mt-1 text-xs text-rose-600">{errors.monthly_salary[0]}</p>}
                </div>

                {/* Roles */}
                <div>
                    <p className="text-sm font-medium text-slate-700">Roles</p>
                    <p className="mb-2 text-xs text-slate-400">Roles are stackable — a user can hold multiple.</p>
                    <div className="space-y-2">
                        {roles.map((role) => (
                            <label
                                key={role.id}
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={form.roles.includes(role.id)}
                                    onChange={() => toggleRole(role.id)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    disabled={isLoading}
                                />
                                <div>
                                    <span className={`text-sm font-medium ${ROLE_COLORS[role.slug] ?? 'text-slate-700'}`}>
                                        {role.name}
                                    </span>
                                    {role.description && (
                                        <p className="text-xs text-slate-400">{role.description}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                    {errors.roles && <p className="mt-1 text-xs text-rose-600">{errors.roles[0]}</p>}
                </div>
            </div>
        </Modal>
    );
}
