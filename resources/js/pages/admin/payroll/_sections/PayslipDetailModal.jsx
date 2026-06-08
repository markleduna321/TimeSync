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
                    {/* Header info — hide attendance grid for 13th month */}
                    {p.cutoff_type === '13th_month' ? (
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
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Monthly Salary</p>
                                <p className="font-medium text-slate-700 mt-0.5">{fmtCurrency(p.monthly_salary)}</p>
                            </div>
                        </div>
                    ) : (
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
                            {p.paid_leave_days > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Paid Leave</p>
                                    <p className="font-medium text-violet-600 mt-0.5">{p.paid_leave_days} day{p.paid_leave_days !== 1 ? 's' : ''}</p>
                                </div>
                            )}
                            {p.unpaid_leave_days > 0 && (
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide">Unpaid Leave</p>
                                    <p className="font-medium text-rose-500 mt-0.5">{p.unpaid_leave_days} day{p.unpaid_leave_days !== 1 ? 's' : ''}</p>
                                </div>
                            )}
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
                    )}

                    {/* Monthly breakdown for 13th month payslips */}
                    {p.cutoff_type === '13th_month' && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Monthly Basic Pay Breakdown</p>
                            <div className="divide-y divide-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                {(p.monthly_breakdown ?? []).map((row) => (
                                    <div key={row.month} className="flex items-center justify-between px-3 py-1.5">
                                        <span className="text-sm text-slate-500">{row.month}</span>
                                        <span className="text-sm font-medium tabular-nums text-slate-700">{fmtCurrency(row.basic_pay)}</span>
                                    </div>
                                ))}
                                {(p.monthly_breakdown ?? []).length === 0 && (
                                    <p className="py-3 text-xs text-slate-400 text-center">No released payslips found for this year.</p>
                                )}
                            </div>
                            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2">
                                <span className="text-sm text-slate-500">Total Basic Pay</span>
                                <span className="text-sm font-medium tabular-nums text-slate-700">{fmtCurrency((p.monthly_breakdown ?? []).reduce((s, r) => s + r.basic_pay, 0))}</span>
                            </div>
                            <div className="mt-1 flex justify-between rounded-lg bg-indigo-50 px-3 py-2">
                                <span className="text-sm font-semibold text-indigo-700">&divide; 12 = 13th Month Pay</span>
                                <span className="text-sm font-bold tabular-nums text-indigo-700">{fmtCurrency(p.basic_pay)}</span>
                            </div>
                        </div>
                    )}

                    {/* Earnings */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Earnings</p>
                        <div className="divide-y divide-slate-50">
                            {earnings.map((l) => (
                                <div key={l.id} className="flex items-center justify-between py-1.5">
                                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                                        {l.description}
                                        {l.code === 'LEAVE_MON' && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                Leave Conversion
                                            </span>
                                        )}
                                    </span>
                                    <span className={`text-sm tabular-nums ${l.code === 'LEAVE_MON' ? 'font-semibold text-amber-700' : 'text-slate-700'}`}>
                                        {fmtCurrency(l.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 flex justify-between border-t border-slate-200 pt-2">
                            <span className="text-sm font-semibold text-slate-700">Gross Pay</span>
                            <span className="text-sm font-bold text-slate-900 tabular-nums">{fmtCurrency(p.gross_pay)}</span>
                        </div>
                    </div>

                    {/* Deductions — hide for 13th month (zero deductions) */}
                    {p.cutoff_type !== '13th_month' && (
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
                    )}

                    {/* Net pay */}
                    <div className="flex items-center justify-between rounded-xl bg-indigo-600 px-5 py-4">
                        <span className="text-base font-bold text-white">NET PAY</span>
                        <span className="text-xl font-extrabold text-white tabular-nums">{fmtCurrency(p.net_pay)}</span>
                    </div>

                    {/* Method + status chips */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {p.method && (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                p.method === 'flat_rate'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                                {p.method === 'flat_rate' ? 'Flat Rate Method' : 'Days-Worked Method'}
                            </span>
                        )}
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
