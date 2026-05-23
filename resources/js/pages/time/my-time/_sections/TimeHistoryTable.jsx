import React from 'react';
import { Table, Skeleton } from 'antd';
import { Clock } from 'lucide-react';

const STATUS_BADGE = {
    active:      'bg-emerald-50 text-emerald-700',
    on_lunch:    'bg-amber-50 text-amber-700',
    on_break:    'bg-sky-50 text-sky-700',
    clocked_out: 'bg-slate-100 text-slate-600',
};

const STATUS_LABEL = {
    active:      'Working',
    on_lunch:    'On Lunch',
    on_break:    'On Break',
    clocked_out: 'Clocked Out',
};

function fmt(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString([], {
        weekday: 'short', month: 'short', day: 'numeric',
    });
}

function fmtMinutes(mins) {
    if (mins === null || mins === undefined) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function lunchMinutes(log) {
    if (!log.lunch_start || !log.lunch_end) return null;
    return Math.floor((new Date(log.lunch_end) - new Date(log.lunch_start)) / 60000);
}

function breakSummary(log) {
    const breaks = log.breaks ?? [];
    const completed = breaks.filter((b) => b.start && b.end);
    if (!completed.length) return '—';
    return completed
        .map((b, i) => {
            const mins = Math.floor((new Date(b.end) - new Date(b.start)) / 60000);
            return `Break ${i + 1}: ${mins}m`;
        })
        .join(' · ');
}

const COLUMNS = [
    {
        title: 'Date',
        key: 'date',
        render: (_, log) => (
            <span className="text-sm font-medium text-slate-700">{fmtDate(log.date)}</span>
        ),
    },
    {
        title: 'Clock In',
        key: 'clock_in',
        render: (_, log) => <span className="text-sm text-slate-600">{fmt(log.clock_in)}</span>,
    },
    {
        title: 'Clock Out',
        key: 'clock_out',
        render: (_, log) => <span className="text-sm text-slate-600">{fmt(log.clock_out)}</span>,
    },
    {
        title: 'Lunch',
        key: 'lunch',
        render: (_, log) => {
            const mins = lunchMinutes(log);
            return (
                <span className="text-sm text-slate-600">
                    {mins !== null ? `${mins}m` : '—'}
                </span>
            );
        },
    },
    {
        title: 'Breaks',
        key: 'breaks',
        render: (_, log) => (
            <span className="text-sm text-slate-600">{breakSummary(log)}</span>
        ),
    },
    {
        title: 'Total',
        key: 'total',
        render: (_, log) => {
            const mins = log.total_worked_minutes;
            if (mins === null || mins === undefined) {
                return <span className="text-xs text-slate-400">—</span>;
            }
            return (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {fmtMinutes(mins)}
                </span>
            );
        },
    },
    {
        title: 'Status',
        key: 'status',
        render: (_, log) => {
            const s = log.status ?? 'clocked_out';
            return (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[s] ?? STATUS_BADGE.clocked_out}`}>
                    {STATUS_LABEL[s] ?? s}
                </span>
            );
        },
    },
];

export default function TimeHistoryTable({ logs, meta, isLoading, page, onPageChange }) {
    if (isLoading) {
        return (
            <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} active paragraph={{ rows: 1 }} />
                ))}
            </div>
        );
    }

    if (!logs.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock size={38} className="mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No records this month</p>
                <p className="mt-1 text-xs text-slate-400">
                    Clock in to start tracking your time.
                </p>
            </div>
        );
    }

    return (
        <Table
            rowKey="id"
            dataSource={logs}
            columns={COLUMNS}
            pagination={{
                current:         page,
                pageSize:        31,
                total:           meta?.total ?? 0,
                onChange:        onPageChange,
                showSizeChanger: false,
                showTotal:       (total) => `${total} record${total !== 1 ? 's' : ''}`,
            }}
            scroll={{ x: 680 }}
        />
    );
}
