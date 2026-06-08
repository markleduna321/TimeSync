import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { CheckCircle, Users } from 'lucide-react';
import { useBulkDraftPayslipsMutation } from '@/features/payroll/payrollApi';

const DEFAULT_FORM = { period_start: '', period_end: '', pay_date: '' };

const METHOD_LABELS = {
    days_worked: 'Days-Worked Method',
    flat_rate:   'Flat Rate Method',
};

function getCutoffDates(cutoff, year, month) {
    const pad = (n) => String(n).padStart(2, '0');
    if (cutoff === 'first') {
        return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-15` };
    }
    const lastDay = new Date(year, month, 0).getDate();
    return { start: `${year}-${pad(month)}-16`, end: `${year}-${pad(month)}-${lastDay}` };
}

export default function BulkDraftModal({ open, onClose, method = 'days_worked' }) {
    const [form, setForm]     = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});
    const [result, setResult] = useState(null); // { generated, skipped, message }
    const methodLabel         = METHOD_LABELS[method] ?? 'Days-Worked Method';
    const isFlatRate          = method === 'flat_rate';

    const [bulkDraft, { isLoading }] = useBulkDraftPayslipsMutation();

    const now       = new Date();
    const thisYear  = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    useEffect(() => {
        if (!open) return;
        setForm(DEFAULT_FORM);
        setErrors({});
        setResult(null);
    }, [open]);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    function quickFill(cutoff) {
        const { start, end } = getCutoffDates(cutoff, thisYear, thisMonth);
        setForm((f) => ({ ...f, period_start: start, period_end: end }));
        setErrors((e) => ({ ...e, period_start: undefined, period_end: undefined }));
    }

    async function handleSubmit() {
        setErrors({});
        setResult(null);
        try {
            const res = await bulkDraft({
                period_start: form.period_start,
                period_end:   form.period_end,
                pay_date:     form.pay_date || null,
                method:       method,
            }).unwrap();
            setResult(res);
        } catch (err) {
            if (err?.status === 422) {
                setErrors(err.data?.errors ?? {});
            } else {
                setErrors({ general: err?.data?.message ?? 'Something went wrong.' });
            }
        }
    }

    function handleClose() {
        onClose();
    }

    const hasResult = !!result;

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    <span className="font-semibold text-slate-800">Bulk Generate Draft Payslips</span>
                </div>
            }
            footer={
                hasResult ? (
                    <div className="flex justify-end">
                        <button
                            onClick={handleClose}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !form.period_start || !form.period_end}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generating…
                                </>
                            ) : (
                                'Generate Drafts'
                            )}
                        </button>
                    </div>
                )
            }
            width={480}
            destroyOnHidden
        >
            <div className="space-y-4 pt-2">
                {/* Method indicator */}
                {!hasResult && (
                    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                        isFlatRate
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isFlatRate ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        Using <strong className="font-semibold">{methodLabel}</strong>
                        {isFlatRate && ' — basic pay = (monthly ÷ 2) − (absent × daily rate)'}
                    </div>
                )}

                {/* Description */}
                {!hasResult && (
                    <p className="text-sm text-slate-500">
                        Generates a draft payslip for every user with the <strong>Employee</strong> role.
                        Employees can review their draft before you release it. Existing payslips for the
                        same period are skipped automatically.
                    </p>
                )}

                {/* Success result */}
                {hasResult && (
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-800">Bulk draft complete</p>
                                <p className="mt-0.5 text-sm text-emerald-700">{result.message}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                                <p className="text-2xl font-bold text-indigo-600 tabular-nums">{result.generated}</p>
                                <p className="mt-0.5 text-xs text-slate-500">Drafts generated</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                                <p className="text-2xl font-bold text-amber-500 tabular-nums">{result.skipped}</p>
                                <p className="mt-0.5 text-xs text-slate-500">Skipped (already exist)</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form — hidden after success */}
                {!hasResult && (
                    <>
                        {errors.general && (
                            <p className="text-xs text-rose-600">{errors.general}</p>
                        )}

                        {/* Quick-fill cutoff buttons */}
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-500">Quick fill — current month</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => quickFill('first')}
                                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                                >
                                    1st Cutoff (1–15)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => quickFill('second')}
                                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                                >
                                    2nd Cutoff (16–end)
                                </button>
                            </div>
                        </div>

                        {/* Period Start / End */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Period Start <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.period_start}
                                    onChange={(e) => set('period_start', e.target.value)}
                                    className={[
                                        'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                        errors.period_start ? 'border-rose-400 bg-rose-50' : 'border-slate-200',
                                    ].join(' ')}
                                    disabled={isLoading}
                                />
                                {errors.period_start && (
                                    <p className="mt-1 text-xs text-rose-600">{errors.period_start[0]}</p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Period End <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.period_end}
                                    onChange={(e) => set('period_end', e.target.value)}
                                    className={[
                                        'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                        errors.period_end ? 'border-rose-400 bg-rose-50' : 'border-slate-200',
                                    ].join(' ')}
                                    disabled={isLoading}
                                />
                                {errors.period_end && (
                                    <p className="mt-1 text-xs text-rose-600">{errors.period_end[0]}</p>
                                )}
                            </div>
                        </div>

                        {/* Pay Date (optional) */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                Pay Date <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <input
                                type="date"
                                value={form.pay_date}
                                onChange={(e) => set('pay_date', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                                disabled={isLoading}
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
