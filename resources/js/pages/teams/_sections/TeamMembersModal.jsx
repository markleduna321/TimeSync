import React from 'react';
import { Modal, Table } from 'antd';
import { Users } from 'lucide-react';

const ROLE_COLORS = {
    super_admin: 'bg-rose-100 text-rose-700',
    admin:       'bg-orange-100 text-orange-700',
    manager:     'bg-violet-100 text-violet-700',
    team_lead:   'bg-sky-100 text-sky-700',
    employee:    'bg-emerald-100 text-emerald-700',
};

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin:       'Admin',
    manager:     'Manager',
    team_lead:   'Team Lead',
    employee:    'Employee',
};

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-sky-100 text-sky-700',
];

function avatarColor(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const columns = [
    {
        title: 'Member',
        key: 'member',
        render: (_, record, index) => (
            <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(index)}`}>
                    {getInitials(record.name)}
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{record.name}</p>
                    <p className="text-xs text-slate-400 truncate">{record.email}</p>
                </div>
            </div>
        ),
    },
    {
        title: 'Roles',
        key: 'roles',
        render: (_, record) => {
            const roles = record.roles ?? [];
            if (roles.length === 0) {
                return <span className="text-xs text-slate-400">No role</span>;
            }
            return (
                <div className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                        <span
                            key={r.slug}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[r.slug] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                            {ROLE_LABELS[r.slug] ?? r.name}
                        </span>
                    ))}
                </div>
            );
        },
    },
];

export default function TeamMembersModal({ team, open, onClose }) {
    const members = team?.members ?? [];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    <span>{team?.name ?? 'Team'} — Members</span>
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {members.length}
                    </span>
                </div>
            }
            width={560}
            destroyOnHidden
        >
            {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                        <Users size={22} className="text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600">No members yet</p>
                    <p className="mt-1 text-sm text-slate-400">Add members by editing this team.</p>
                </div>
            ) : (
                <Table
                    dataSource={members}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="mt-2"
                    rowClassName="hover:bg-slate-50/60 transition-colors"
                />
            )}
        </Modal>
    );
}
