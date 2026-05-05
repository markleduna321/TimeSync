import React from 'react';
import { Modal } from 'antd';
import { useGetPayslipQuery } from '@/features/payroll/payrollApi';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function Row({ label, value, bold, className }) {
    return (
        <div className={`flex items-center justify-between py-1.5 ${className ?? ''}`}>
            <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{label}</span>
            <span className={`text-sm tabular-nums ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value}</span>
        </div>
    );
}

export default function PayslipDetailModal({ open, onClose, payslipId }) {
    const { data, isLoading } = useGetPayslipQuery(payslipId, { skip: !payslipId });
    const p = data?.data ?? data ?? null;

    const earnings   = p?.lines?.filter((l) => l.category === 'earning')   ?? [];
    const deductions = p?.lines?.filter((l) => l.category === 'deduction') ?? [];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={580}
            title={
                <div className="text-slate-800 font-semibold">
                    Payslip — {p?.user?.name ?? '…'}
                </div>
            }
            destroyOnHidden
        >
            {isLoading || !p ? (
                <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
            ) : (
                <div className="mt-2 space-y-5 text-sm">
                    {/* Header info */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Pay Period</p>
                            <p className="font-medium text-slate-700 mt-0.5">{p.period_start} → {p.period_end}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Pay Date</p>
                            <p className="font-medium text-slate-700 mt-0.5">{p.pay_date ?? 'TBD'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Days Worked</p>
                            <p className="font-medium text-slate-700 mt-0.5">{p.days_worked} / {p.days_scheduled} scheduled</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Absences</p>
                            <p className="font-medium text-rose-600 mt-0.5">{p.days_absent} day{p.days_absent !== 1 ? 's' : ''}</p>
                        </div>
                        {p.late_minutes > 0 && (
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Late</p>
                                <p className="font-medium text-amber-600 mt-0.5">{p.late_minutes} min</p>
                            </div>
                        )}
                        {p.undertime_minutes > 0 && (
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Undertime</p>
                                <p className="font-medium text-orange-600 mt-0.5">{p.undertime_minutes} min</p>
                            </div>
                        )}
                    </div>

                    {/* Earnings */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Earnings</p>
                        <div className="divide-y divide-slate-50">
                            {earnings.map((l) => (
                                <Row key={l.id} label={l.description} value={fmtCurrency(l.amount)} />
                            ))}
                        </div>
                        <div className="mt-1 flex justify-between border-t border-slate-200 pt-2">
                            <span className="text-sm font-semibold text-slate-700">Gross Pay</span>
                            <span className="text-sm font-bold text-slate-900 tabular-nums">{fmtCurrency(p.gross_pay)}</span>
                        </div>
                    </div>

                    {/* Deductions */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Deductions</p>
                        <div className="divide-y divide-slate-50">
                            {deductions.map((l) => (
                                <Row key={l.id} label={l.description} value={`(${fmtCurrency(l.amount)})`} className="text-rose-600" />
                            ))}
                        </div>
                        <div className="mt-1 flex justify-between border-t border-slate-200 pt-2">
                            <span className="text-sm font-semibold text-slate-700">Total Deductions</span>
                            <span className="text-sm font-bold text-rose-600 tabular-nums">({fmtCurrency(p.total_deductions)})</span>
                        </div>
                    </div>

                    {/* Net pay */}
                    <div className="flex items-center justify-between rounded-xl bg-indigo-600 px-5 py-4">
                        <span className="text-base font-bold text-white">NET PAY</span>
                        <span className="text-xl font-extrabold text-white tabular-nums">{fmtCurrency(p.net_pay)}</span>
                    </div>

                    {/* Status chip */}
                    <div className="flex justify-end">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${p.status === 'released' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                            {p.status}
                            {p.released_at ? ` · ${p.released_at.slice(0, 10)}` : ''}
                        </span>
                    </div>
                </div>
            )}
        </Modal>
    );
}
