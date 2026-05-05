import React from 'react';
import { Table, Tooltip } from 'antd';
import { Pencil, Trash2, Users } from 'lucide-react';

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function TeamTable({ teams, meta, isLoading, page, onPageChange, onEdit, onDelete }) {
    const columns = [
        {
            title: 'Team',
            dataIndex: 'name',
            key: 'name',
            render: (name) => (
                <span className="font-medium text-slate-800">{name}</span>
            ),
        },
        {
            title: 'Team Lead',
            dataIndex: 'leader',
            key: 'leader',
            render: (leader) =>
                leader ? (
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {getInitials(leader.name)}
                        </span>
                        <span className="text-sm text-slate-700">{leader.name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                ),
        },
        {
            title: 'Manager',
            dataIndex: 'manager',
            key: 'manager',
            render: (manager) =>
                manager ? (
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                            {getInitials(manager.name)}
                        </span>
                        <span className="text-sm text-slate-700">{manager.name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                ),
        },
        {
            title: 'Members',
            dataIndex: 'members',
            key: 'members',
            render: (members) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    <Users size={11} />
                    {members?.length ?? 0}
                </span>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (v) => <span className="text-sm text-slate-400">{v || '—'}</span>,
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

    if (!isLoading && teams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Users size={26} className="text-slate-400" />
                </div>
                <p className="font-medium text-slate-700">No teams yet</p>
                <p className="mt-1 text-sm text-slate-400">
                    Create a team to assign employees to a team lead.
                </p>
            </div>
        );
    }

    return (
        <Table
            dataSource={teams}
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
