import React, { useState } from 'react';
import { Table, Tabs, Popconfirm, Skeleton, message } from 'antd';
import { CheckSquare, Download, CalendarDays } from 'lucide-react';
import { useGetCorrectionsQuery, useReviewCorrectionMutation } from '@/features/timekeeping/attendanceApi';
import { useGetLeaveApplicationsQuery, useReviewLeaveApplicationMutation } from '@/features/leave/leaveApi';

const UI_LOCALE = 'en-PH';
const UI_TIMEZONE = 'Asia/Manila';

const STATUS_BADGE = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
};

const TAB_ITEMS = [
    { key: '',         label: 'All'      },
    { key: 'pending',  label: 'Pending'  },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(UI_LOCALE, {
        weekday: 'short', month: 'short', day: 'numeric',
        timeZone: UI_TIMEZONE,
    });
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(UI_LOCALE, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: UI_TIMEZONE,
    });
}

function fmtTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString(UI_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: UI_TIMEZONE,
    });
}
function fmtTimeStr(timeStr) {
    if (!timeStr) return '—';
    // Backend stores requested_clock_in/out as TIME in UTC. Append 'Z' so
    // JS treats the literal as UTC, then toLocaleTimeString converts to
    // the user's local zone (Asia/Manila) — matching ClockWidget.
    return new Date('1970-01-01T' + timeStr + 'Z').toLocaleTimeString(UI_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}
function fmtFull(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(UI_LOCALE, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: UI_TIMEZONE,
    });
}

/* ── History panel (expanded row) ─────────────────────────────────────── */
function HistoryPanel({ history }) {
    if (!history?.length) {
        return (
            <p className="py-3 text-center text-xs text-slate-400">No time-log history recorded.</p>
        );
    }

    return (
        <div className="space-y-2 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Time Log History</p>
            {history.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 border border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                    {/* Clock In change */}
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-400">Clock In</span>
                        <span className="tabular-nums text-rose-500 line-through">{fmtTime(h.old_clock_in)}</span>
                        <span className="text-slate-400">→</span>
                        <span className="tabular-nums font-semibold text-emerald-600">{fmtTime(h.new_clock_in)}</span>
                    </div>
                    {/* Clock Out change */}
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-400">Clock Out</span>
                        <span className="tabular-nums text-rose-500 line-through">{fmtTime(h.old_clock_out)}</span>
                        <span className="text-slate-400">→</span>
                        <span className="tabular-nums font-semibold text-emerald-600">{fmtTime(h.new_clock_out)}</span>
                    </div>
                    {/* Meta */}
                    <div className="ml-auto flex items-center gap-1.5 text-slate-400">
                        <span>by <strong className="text-slate-600">{h.changed_by ?? 'System'}</strong></span>
                        <span>·</span>
                        <span>{fmtFull(h.changed_at)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Review action cell ───────────────────────────────────────────────── */
function ReviewActions({ record }) {
    const [adminNote, setAdminNote] = useState('');
    const [reviewCorrection, { isLoading }] = useReviewCorrectionMutation();

    async function handleReview(action) {
        try {
            await reviewCorrection({ id: record.id, action, admin_note: adminNote || undefined }).unwrap();
            const requestLabel = record.type === 'overtime' ? 'Overtime request' : 'Correction request';
            const actionLabel = action === 'approved' ? 'approved' : 'rejected';
            message.success(`${requestLabel} ${actionLabel}.`);
            setAdminNote('');
        } catch (err) {
            const fallback = 'Unable to review request. Please try again.';
            message.error(err?.data?.message || fallback);
        }
    }

    if (record.status !== 'pending') return null;

    return (
        <div className="flex flex-col gap-1.5">
            <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin note (optional)"
                maxLength={500}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {isLoading && <span className="text-xs text-slate-500">Saving...</span>}
            <div className="flex gap-1.5">
                <Popconfirm
                    title="Approve this correction?"
                    okText="Approve"
                    okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 border-none text-white' }}
                    onConfirm={() => handleReview('approved')}
                >
                    <button
                        type="button"
                        disabled={isLoading}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                        Approve
                    </button>
                </Popconfirm>
                <Popconfirm
                    title="Reject this correction?"
                    okText="Reject"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleReview('rejected')}
                >
                    <button
                        type="button"
                        disabled={isLoading}
                        className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                    >
                        Reject
                    </button>
                </Popconfirm>
            </div>
        </div>
    );
}

/* ── Leave ReviewActions ─────────────────────────────────────────────── */
function LeaveReviewActions({ record }) {
    const [adminNote, setAdminNote] = useState('');
    const [reviewLeave, { isLoading }] = useReviewLeaveApplicationMutation();

    async function handleReview(action) {
        try {
            await reviewLeave({ id: record.id, action, admin_note: adminNote || undefined }).unwrap();
            message.success(`Leave application ${action}.`);
            setAdminNote('');
        } catch (err) {
            message.error(err?.data?.message || 'Unable to review. Please try again.');
        }
    }

    if (record.status !== 'pending') return null;

    return (
        <div className="flex flex-col gap-1.5">
            <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin note (optional)"
                maxLength={500}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            {isLoading && <span className="text-xs text-slate-500">Saving...</span>}
            <div className="flex gap-1.5">
                <Popconfirm title="Approve this leave?" okText="Approve"
                    okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 border-none text-white' }}
                    onConfirm={() => handleReview('approved')}>
                    <button type="button" disabled={isLoading}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                        Approve
                    </button>
                </Popconfirm>
                <Popconfirm title="Reject this leave?" okText="Reject" okButtonProps={{ danger: true }}
                    onConfirm={() => handleReview('rejected')}>
                    <button type="button" disabled={isLoading}
                        className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 transition-colors">
                        Reject
                    </button>
                </Popconfirm>
            </div>
        </div>
    );
}

/* ── Leave requests table ─────────────────────────────────────────────── */
function LeaveRequestsPane() {
    const [leaveTab, setLeaveTab] = useState('pending');
    const [page, setPage]        = useState(1);

    const { data, isLoading } = useGetLeaveApplicationsQuery(
        { status: leaveTab || undefined, page },
        { refetchOnMountOrArgChange: true },
    );

    const applications = data?.data ?? [];
    const meta         = data?.meta ?? {};

    const LEAVE_TAB_ITEMS = [
        { key: 'pending',  label: 'Pending'  },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
        { key: '',         label: 'All'      },
    ];

    const columns = [
        {
            title: 'Employee', key: 'user', width: 160,
            render: (_, r) => (
                <div>
                    <p className="text-sm font-medium text-slate-700">{r.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{r.user?.email ?? ''}</p>
                </div>
            ),
        },
        {
            title: 'Type', key: 'type', width: 130,
            render: (_, r) => (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: r.leave_type?.color + '22', color: r.leave_type?.color ?? '#6d28d9' }}>
                    {r.leave_type?.name ?? '—'}
                </span>
            ),
        },
        {
            title: 'Period', key: 'period', width: 180,
            render: (_, r) => (
                <div className="text-xs text-slate-600">
                    <p className="font-medium">
                        {fmtDate(r.start_date)}
                        {r.start_date !== r.end_date && <> – {fmtDate(r.end_date)}</>}
                    </p>
                    <p className="text-slate-400">
                        {r.half_day ? `Half Day · ${r.half_day_period}` : `${r.days_requested} day(s)`}
                    </p>
                </div>
            ),
        },
        {
            title: 'Reason', key: 'reason',
            render: (_, r) => (
                <p className="max-w-xs truncate text-sm text-slate-600" title={r.reason ?? ''}>{r.reason || <span className="text-slate-300">—</span>}</p>
            ),
        },
        {
            title: 'Status', key: 'status', width: 100,
            render: (_, r) => (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
            ),
        },
        {
            title: 'Actions', key: 'actions', width: 200,
            render: (_, r) => <LeaveReviewActions record={r} />,
        },
    ];

    return (
        <>
            <div className="px-6">
                <Tabs
                    activeKey={leaveTab}
                    onChange={(k) => { setLeaveTab(k); setPage(1); }}
                    items={LEAVE_TAB_ITEMS}
                    size="small"
                />
            </div>
            {isLoading ? (
                <div className="space-y-3 p-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} active paragraph={{ rows: 1 }} />)}
                </div>
            ) : (
                <Table
                    rowKey="id"
                    dataSource={applications}
                    columns={columns}
                    pagination={{
                        current: page, pageSize: 20, total: meta?.total ?? 0,
                        onChange: setPage, showSizeChanger: false,
                        showTotal: (t) => `${t} application${t !== 1 ? 's' : ''}`,
                    }}
                    scroll={{ x: 800 }}
                    locale={{
                        emptyText: (
                            <div className="flex flex-col items-center justify-center py-12">
                                <CalendarDays size={36} className="mb-3 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">No leave applications</p>
                                <p className="mt-1 text-xs text-slate-400">{leaveTab === 'pending' ? 'Nothing pending review.' : 'Nothing here yet.'}</p>
                            </div>
                        ),
                    }}
                />
            )}
        </>
    );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function CorrectionQueueTable() {
    const [requestType, setRequestType] = useState('corrections');
    const [activeTab, setActiveTab] = useState('pending');
    const [page, setPage]           = useState(1);

    const { data, isLoading } = useGetCorrectionsQuery(
        { status: activeTab || undefined, page },
        { refetchOnMountOrArgChange: true },
    );

    const corrections = data?.data  ?? [];
    const meta        = data?.meta  ?? {};

    function handleTabChange(key) {
        setActiveTab(key);
        setPage(1);
    }

    const columns = [
        {
            title: 'Employee',
            key: 'user',
            width: 160,
            render: (_, r) => (
                <div>
                    <p className="text-sm font-medium text-slate-700">{r.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{r.user?.email ?? ''}</p>
                </div>
            ),
        },
        {
            title: 'Date',
            key: 'date',
            width: 110,
            render: (_, r) => <span className="text-sm text-slate-600">{fmtDate(r.date)}</span>,
        },
        {
            title: 'Reason',
            key: 'reason',
            render: (_, r) => (
                <p className="max-w-xs truncate text-sm text-slate-600" title={r.reason}>{r.reason}</p>
            ),
        },
        {
            title: 'Requested Times',
            key: 'times',
            width: 150,
            render: (_, r) => (
                <div className="text-xs text-slate-500 tabular-nums">
                    <span>In: <strong>{fmtTimeStr(r.requested_clock_in)}</strong></span>
                    <span className="ml-2">Out: <strong>{fmtTimeStr(r.requested_clock_out)}</strong></span>
                </div>
            ),
        },
        {
            title: 'Proof',
            key: 'proof',
            width: 70,
            render: (_, r) => r.proof_url ? (
                <a
                    href={r.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download proof"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
                >
                    <Download size={13} /> View
                </a>
            ) : <span className="text-xs text-slate-300">—</span>,
        },
        {
            title: 'Filed',
            key: 'filed',
            width: 100,
            render: (_, r) => <span className="text-xs text-slate-400">{fmtDateTime(r.created_at)}</span>,
        },
        {
            title: 'Type',
            key: 'type',
            width: 100,
            render: (_, r) => (
                <span className={[
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    r.type === 'overtime' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
                ].join(' ')}>
                    {r.type === 'overtime' ? 'Overtime' : 'Correction'}
                </span>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, r) => (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, r) => <ReviewActions record={r} />,
        },
    ];

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                        {requestType === 'corrections' ? 'Correction Requests' : 'Leave Requests'}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                        {requestType === 'corrections'
                            ? 'Review and action employee attendance correction submissions.'
                            : 'Review and action employee leave applications.'}
                    </p>
                </div>
                {/* Request type switcher */}
                <div className="flex rounded-lg border border-slate-200 p-0.5" role="group">
                    {[{ value: 'corrections', label: 'Corrections' }, { value: 'leaves', label: 'Leave Requests' }].map(({ value, label }) => (
                        <button key={value} type="button"
                            onClick={() => setRequestType(value)}
                            className={[
                                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400',
                                requestType === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
                            ].join(' ')}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {requestType === 'leaves' ? (
                <LeaveRequestsPane />
            ) : (
            <>
            <div className="px-6">
                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    items={TAB_ITEMS.map(({ key, label }) => ({ key, label }))}
                    size="small"
                />
            </div>

            {isLoading ? (
                <div className="space-y-3 p-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} active paragraph={{ rows: 1 }} />
                    ))}
                </div>
            ) : (
                <Table
                    rowKey="id"
                    dataSource={corrections}
                    columns={columns}
                    expandable={{
                        rowExpandable: (r) => r.type === 'correction' && r.status === 'approved',
                        expandedRowRender: (r) => <HistoryPanel history={r.history} />,
                        expandRowByClick: false,
                    }}
                    pagination={{
                        current:         page,
                        pageSize:        20,
                        total:           meta?.total ?? 0,
                        onChange:        setPage,
                        showSizeChanger: false,
                        showTotal:       (t) => `${t} request${t !== 1 ? 's' : ''}`,
                    }}
                    scroll={{ x: 900 }}
                    locale={{
                        emptyText: (
                            <div className="flex flex-col items-center justify-center py-12">
                                <CheckSquare size={36} className="mb-3 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">
                                    No correction requests
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {activeTab === 'pending' ? 'All corrections have been reviewed.' : 'Nothing here yet.'}
                                </p>
                            </div>
                        ),
                    }}
                />
            )}
            </>
            )}
        </div>
    );
}
