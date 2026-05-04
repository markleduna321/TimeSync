import React from 'react';
import { Table, Skeleton } from 'antd';
import { CalendarClock, Edit2, Plus } from 'lucide-react';

const DAY_COLORS = {
    Mon: 'bg-indigo-50 text-indigo-600',
    Tue: 'bg-indigo-50 text-indigo-600',
    Wed: 'bg-indigo-50 text-indigo-600',
    Thu: 'bg-indigo-50 text-indigo-600',
    Fri: 'bg-indigo-50 text-indigo-600',
    Sat: 'bg-amber-50 text-amber-600',
    Sun: 'bg-rose-50 text-rose-600',
};

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function Avatar({ name }) {
    return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            {getInitials(name)}
        </div>
    );
}

const COLUMNS = (onAssign) => [
    {
        title: 'Employee',
        key: 'employee',
        render: (_, user) => (
            <div className="flex items-center gap-3">
                <Avatar name={user.name} />
                <div>
                    <p className="text-sm font-medium text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                </div>
            </div>
        ),
    },
    {
        title: 'Work Days',
        key: 'work_days',
        render: (_, user) => {
            const days = user.schedule?.work_days ?? [];
            if (!days.length) return <span className="text-xs text-slate-400">—</span>;
            return (
                <div className="flex flex-wrap gap-1">
                    {days.map((d) => (
                        <span
                            key={d}
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${DAY_COLORS[d] ?? 'bg-slate-100 text-slate-500'}`}
                        >
                            {d}
                        </span>
                    ))}
                </div>
            );
        },
    },
    {
        title: 'Shift',
        key: 'shift',
        render: (_, user) => {
            const s = user.schedule;
            if (!s?.shift_start) return <span className="text-xs text-slate-400">—</span>;
            return (
                <span className="text-sm text-slate-700">
                    {s.shift_start} → {s.shift_end}
                </span>
            );
        },
    },
    {
        title: 'Status',
        key: 'status',
        render: (_, user) =>
            user.schedule?.id ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Assigned
                </span>
            ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Unassigned
                </span>
            ),
    },
    {
        title: '',
        key: 'actions',
        align: 'right',
        render: (_, user) =>
            user.schedule?.id ? (
                <button
                    onClick={() => onAssign(user)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label={`Edit schedule for ${user.name}`}
                >
                    <Edit2 size={12} />
                    Edit
                </button>
            ) : (
                <button
                    onClick={() => onAssign(user)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label={`Assign schedule to ${user.name}`}
                >
                    <Plus size={12} />
                    Assign
                </button>
            ),
    },
];

export default function ScheduleTable({ users, meta, isLoading, page, onPageChange, onAssign }) {
    if (isLoading) {
        return (
            <div className="space-y-3 p-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} active avatar paragraph={{ rows: 1 }} />
                ))}
            </div>
        );
    }

    if (!users.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarClock size={40} className="mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No employees found</p>
                <p className="mt-1 text-xs text-slate-400">
                    Employees will appear here once users are created.
                </p>
            </div>
        );
    }

    return (
        <Table
            rowKey="id"
            dataSource={users}
            columns={COLUMNS(onAssign)}
            pagination={{
                current:  page,
                pageSize: 20,
                total:    meta?.total ?? 0,
                onChange: onPageChange,
                showSizeChanger: false,
                showTotal: (total) => `${total} employee${total !== 1 ? 's' : ''}`,
            }}
            className="ant-table-slim"
            scroll={{ x: 640 }}
        />
    );
}
