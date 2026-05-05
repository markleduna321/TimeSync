import React, { useState } from 'react';
import { Modal, Spin } from 'antd';
import { CircleCheck } from 'lucide-react';
import { useBulkReleasePayslipsMutation } from '@/features/payroll/payrollApi';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function BulkReleaseModal({ open, onClose, selectedPayslips, onSuccess }) {
    const [result, setResult] = useState(null);
    const [bulkRelease, { isLoading }] = useBulkReleasePayslipsMutation();

    async function handleRelease() {
        const ids = selectedPayslips.map((p) => p.id);
        try {
            const res = await bulkRelease({ payslip_ids: ids }).unwrap();
            setResult(res);
            onSuccess?.();
        } catch {
            // error handled by RTK Query / global handler
        }
    }

    function handleClose() {
        setResult(null);
        onClose();
    }

    const totalNet = selectedPayslips.reduce((s, p) => s + Number(p.net_pay ?? 0), 0);

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            destroyOnHidden
            width={560}
            title={null}
        >
            <Spin spinning={isLoading}>
                {result ? (
                    /* ── Success state ── */
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                            <CircleCheck size={36} className="text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Payslips Released</h3>
                        <p className="text-sm text-slate-500">
                            <span className="font-semibold text-green-600">{result.released}</span> payslip{result.released !== 1 ? 's' : ''} released successfully.
                            {result.skipped > 0 && (
                                <> &nbsp;<span className="text-slate-400">({result.skipped} skipped — already released or not found.)</span></>
                            )}
                        </p>
                        <button
                            onClick={handleClose}
                            className="mt-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* ── Confirmation state ── */
                    <div className="space-y-5 pt-2">
                        <div>
                            <h3 className="text-base font-semibold text-slate-800">Bulk Release Payslips</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                The following {selectedPayslips.length} draft payslip{selectedPayslips.length !== 1 ? 's' : ''} will be released and become visible to employees.
                            </p>
                        </div>

                        {/* Scrollable list */}
                        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                            {selectedPayslips.map((p) => (
                                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{p.user?.name ?? '—'}</p>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {p.period_start} → {p.period_end}
                                            {p.cutoff_type ? ` · ${p.cutoff_type === 'first' ? '1st' : '2nd'} cutoff` : ''}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                                        {fmtCurrency(p.net_pay)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                            <span className="text-sm font-medium text-slate-600">Total Net Pay</span>
                            <span className="text-base font-bold tabular-nums text-indigo-700">
                                {fmtCurrency(totalNet)}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={handleClose}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRelease}
                                disabled={isLoading || selectedPayslips.length === 0}
                                className="rounded-xl bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                            >
                                Release {selectedPayslips.length} Payslip{selectedPayslips.length !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                )}
            </Spin>
        </Modal>
    );
}
