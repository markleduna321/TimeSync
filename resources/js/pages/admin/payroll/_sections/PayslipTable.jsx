import React from 'react';
import { Modal } from 'antd';
import { Send, Trash2, Eye } from 'lucide-react';

const CUTOFF_BADGE = {
    first:  'bg-sky-50 text-sky-600 border border-sky-200',
    second: 'bg-violet-50 text-violet-600 border border-violet-200',
};

const STATUS_BADGE = {
    draft:    'bg-amber-50 text-amber-600 border border-amber-200',
    released: 'bg-green-50 text-green-600 border border-green-200',
};

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function PayslipTable({ payslips, isLoading, onView, onRelease, onDelete, releasingId, deletingId }) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                Loading payslips…
            </div>
        );
    }

    if (!payslips.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-sm text-slate-400">No payslips found.</p>
            </div>
        );
    }

    function confirmRelease(p) {
        Modal.confirm({
            title: 'Release Payslip',
            content: `Release payslip for ${p.user?.name} (${p.period_start} → ${p.period_end})? The employee will be able to view it.`,
            okText: 'Release',
            okButtonProps: { loading: releasingId === p.id },
            cancelText: 'Cancel',
            onOk: () => onRelease(p.id),
        });
    }

    function confirmDelete(p) {
        Modal.confirm({
            title: 'Delete Draft Payslip',
            content: `Permanently delete this draft payslip for ${p.user?.name}?`,
            okText: 'Delete',
            okButtonProps: { danger: true, loading: deletingId === p.id },
            cancelText: 'Cancel',
            onOk: () => onDelete(p.id),
        });
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-5 py-3 text-left font-medium text-slate-500">Employee</th>
                        <th className="px-5 py-3 text-left font-medium text-slate-500">Period</th>
                        <th className="px-5 py-3 text-left font-medium text-slate-500">Cutoff</th>
                        <th className="px-5 py-3 text-right font-medium text-slate-500">Basic Pay</th>
                        <th className="px-5 py-3 text-right font-medium text-slate-500">Deductions</th>
                        <th className="px-5 py-3 text-right font-medium text-slate-500">Net Pay</th>
                        <th className="px-5 py-3 text-left font-medium text-slate-500">Status</th>
                        <th className="px-5 py-3 text-right font-medium text-slate-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {payslips.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-slate-800">{p.user?.name ?? '—'}</td>
                            <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                                {p.period_start}<br />{p.period_end}
                            </td>
                            <td className="px-5 py-3">
                                {p.cutoff_type && (
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CUTOFF_BADGE[p.cutoff_type] ?? ''}`}>
                                        {p.cutoff_type === 'first' ? '1st' : '2nd'}
                                    </span>
                                )}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(p.basic_pay)}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-rose-600">{fmtCurrency(p.total_deductions)}</td>
                            <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-800">{fmtCurrency(p.net_pay)}</td>
                            <td className="px-5 py-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[p.status] ?? ''}`}>
                                    {p.status}
                                </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                    <button
                                        onClick={() => onView(p)}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                        title="View detail"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    {p.status === 'draft' && (
                                        <>
                                            <button
                                                onClick={() => confirmRelease(p)}
                                                disabled={releasingId === p.id}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-40"
                                                title="Release to employee"
                                            >
                                                <Send size={14} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(p)}
                                                disabled={deletingId === p.id}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40"
                                                title="Delete draft"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
