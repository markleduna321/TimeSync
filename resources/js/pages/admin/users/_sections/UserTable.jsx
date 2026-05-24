import React from 'react';
import { Table, Tag, Tooltip } from 'antd';
import { Pencil, Trash2, Users } from 'lucide-react';

/* Role → badge colour mapping */
const ROLE_COLORS = {
    super_admin: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    admin:       { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
    manager:     { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    team_lead:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
    employee:    { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200'  },
};

function RoleBadge({ role }) {
    const c = ROLE_COLORS[role.slug] ?? ROLE_COLORS.employee;
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text} ${c.border}`}
        >
            {role.name}
        </span>
    );
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-amber-500',  'bg-sky-500',     'bg-rose-500',
];

export default function UserTable({ users, meta, isLoading, page, onPageChange, onEdit, onDelete, hasFilters }) {
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => {
                const colorClass = AVATAR_COLORS[(record.id ?? 0) % AVATAR_COLORS.length];
                return (
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden text-xs font-semibold text-white ${record.avatar_url ? '' : colorClass}`}
                            aria-hidden="true"
                        >
                            {record.avatar_url
                                ? <img src={record.avatar_url} alt={name} className="h-full w-full object-cover" />
                                : getInitials(name)
                            }
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">{name}</p>
                            <p className="text-xs text-slate-400">{record.email}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Roles',
            dataIndex: 'roles',
            key: 'roles',
            render: (roles) =>
                roles?.length ? (
                    <div className="flex flex-wrap gap-1">
                        {roles.map((r) => <RoleBadge key={r.id} role={r} />)}
                    </div>
                ) : (
                    <span className="text-xs text-slate-400">No roles</span>
                ),
        },
        {
            title: 'Joined',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (v) => v ? new Date(v).toLocaleDateString() : '—',
        },
        {
            title: '',
            key: 'actions',
            width: 80,
            render: (_, record) => (
                <div className="flex items-center gap-1">
                    <Tooltip title="Edit">
                        <button
                            onClick={() => onEdit(record)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label={`Edit ${record.name}`}
                        >
                            <Pencil size={14} />
                        </button>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <button
                            onClick={() => onDelete(record)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                            aria-label={`Delete ${record.name}`}
                        >
                            <Trash2 size={14} />
                        </button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    if (!isLoading && users.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Users size={26} className="text-slate-400" />
                </div>
                {hasFilters ? (
                    <>
                        <p className="font-medium text-slate-700">No users match your filters</p>
                        <p className="mt-1 text-sm text-slate-400">Try adjusting your search or filter criteria.</p>
                    </>
                ) : (
                    <>
                        <p className="font-medium text-slate-700">No users yet</p>
                        <p className="mt-1 text-sm text-slate-400">Create your first user to get started.</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <Table
            dataSource={users}
            columns={columns}
            loading={isLoading}
            rowKey="id"
            pagination={{
                current: page,
                pageSize: meta?.per_page ?? 20,
                total: meta?.total ?? 0,
                onChange: onPageChange,
                showSizeChanger: false,
                className: 'px-4 pb-2',
            }}
            className="rounded-2xl"
            rowClassName="hover:bg-slate-50/60 transition-colors"
        />
    );
}
