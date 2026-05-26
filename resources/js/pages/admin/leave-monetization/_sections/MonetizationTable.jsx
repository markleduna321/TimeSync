import React, { useState } from 'react';
import { Modal } from 'antd';
import { CheckCircle, Layers } from 'lucide-react';
import {
    useGetLeaveMonetizationsQuery,
    useProcessLeaveMonetizationMutation,
    useBulkProcessLeaveMonetizationsMutation,
} from '@/features/leave/leaveApi';

const CURRENT_YEAR = new Date().getFullYear();

const STATUS_BADGE = {
    pending:   'bg-amber-100 text-amber-700',
    processed: 'bg-green-100 text-green-700',
};

function fmt(val) {
    return typeof val === 'number'
        ? val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : val;
}

export default function MonetizationTable() {
    const [year,        setYear]        = useState(CURRENT_YEAR - 1);
    const [statusTab,   setStatusTab]   = useState('all');
    const [page,        setPage]        = useState(1);
    const perPage = 20;

    // Process single
    const [processTarget, setProcessTarget] = useState(null); // monetization record
    const [notes,         setNotes]         = useState('');

    // Bulk process confirm
    const [bulkConfirm, setBulkConfirm] = useState(false);

    const params = {
        year,
        per_page: perPage,
        page,
        ...(statusTab !== 'all' ? { status: statusTab } : {}),
    };

    const { data, isLoading } = useGetLeaveMonetizationsQuery(params);
    const [processOne,  { isLoading: processingOne }]  = useProcessLeaveMonetizationMutation();
    const [processBulk, { isLoading: processingBulk }] = useBulkProcessLeaveMonetizationsMutation();

    const records    = data?.data    ?? [];
    const pagination = data?.meta    ?? {};
    const hasPending = records.some((r) => r.status === 'pending');

    const handleProcessOne = async () => {
        await processOne({ id: processTarget.id, notes }).unwrap();
        setProcessTarget(null);
        setNotes('');
    };

    const handleBulkProcess = async () => {
        await processBulk({ year }).unwrap();
        setBulkConfirm(false);
    };

    const availableYears = Array.from(
        { length: CURRENT_YEAR - 2019 },
        (_, i) => CURRENT_YEAR - i
    );

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Year + Status filters */}
                <div className="flex items-center gap-3">
                    <select
                        value={year}
                        onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    {/* Status tabs */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                        {['all', 'pending', 'processed'].map((s) => (
                            <button
                                key={s}
                                onClick={() => { setStatusTab(s); setPage(1); }}
                                className={[
                                    'px-4 py-1.5 capitalize transition-colors',
                                    statusTab === s
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50',
                                ].join(' ')}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bulk process */}
                {hasPending && (
                    <button
                        onClick={() => setBulkConfirm(true)}
                        disabled={processingBulk}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                    >
                        <Layers size={14} />
                        Process All Pending ({year})
                    </button>
                )}
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
                    <CheckCircle size={36} className="text-slate-300 mb-3" />
                    <p className="font-medium text-slate-600">No monetization records for this period</p>
                    <p className="mt-1 text-sm text-slate-400">Run the year-end process above to generate records.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['Employee', 'Leave Type', 'Year', 'Eligible Days', 'Daily Rate', 'Amount', 'Status', 'Processed At', ''].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {records.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{r.user?.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="flex items-center gap-1.5">
                                                <span
                                                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: r.leave_type?.color }}
                                                />
                                                {r.leave_type?.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{r.year}</td>
                                        <td className="px-4 py-3 text-slate-600">{fmt(r.eligible_days)}</td>
                                        <td className="px-4 py-3 text-slate-600">₱{fmt(r.daily_rate_used)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">₱{fmt(r.amount)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[r.status]}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {r.processed_at
                                                ? new Date(r.processed_at).toLocaleDateString()
                                                : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.status === 'pending' && (
                                                <button
                                                    onClick={() => { setProcessTarget(r); setNotes(''); }}
                                                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                                                >
                                                    Process
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Showing {pagination.from}–{pagination.to} of {pagination.total}</span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    className="rounded-lg border px-3 py-1 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page >= pagination.last_page}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="rounded-lg border px-3 py-1 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Process single modal */}
            <Modal
                open={!!processTarget}
                onCancel={() => setProcessTarget(null)}
                onOk={handleProcessOne}
                okText="Mark as Processed"
                okButtonProps={{ loading: processingOne }}
                title={<span className="flex items-center gap-2"><CheckCircle size={16} className="text-green-600" /> Mark as Processed</span>}
            >
                {processTarget && (
                    <div className="space-y-3 text-sm text-slate-700">
                        <p>
                            Marking <strong>{processTarget.user?.name}</strong>'s{' '}
                            <strong>{processTarget.leave_type?.name}</strong> monetization of{' '}
                            <strong>₱{fmt(processTarget.amount)}</strong> as processed.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes (optional)</label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                maxLength={500}
                                placeholder="e.g. Included in March payroll…"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Bulk process confirm modal */}
            <Modal
                open={bulkConfirm}
                onCancel={() => setBulkConfirm(false)}
                onOk={handleBulkProcess}
                okText="Process All Pending"
                okButtonProps={{ loading: processingBulk }}
                title="Process All Pending Records"
            >
                <p className="text-sm text-slate-700">
                    This will mark <strong>all pending</strong> monetization records for <strong>{year}</strong> as processed.
                    This is typically done after including these amounts in payroll. Continue?
                </p>
            </Modal>
        </div>
    );
}
