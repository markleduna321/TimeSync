import React from 'react';
import { Modal } from 'antd';
import { useGetPayslipQuery } from '@/features/payroll/payrollApi';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function fmtMinutes(mins) {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function MetricCard({ label, value, sub, color = 'slate' }) {
    const colors = {
        slate:  'bg-slate-50 border-slate-100 text-slate-800',
        green:  'bg-green-50 border-green-100 text-green-700',
        rose:   'bg-rose-50 border-rose-100 text-rose-700',
        amber:  'bg-amber-50 border-amber-100 text-amber-700',
        orange: 'bg-orange-50 border-orange-100 text-orange-700',
        indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
        violet: 'bg-violet-50 border-violet-100 text-violet-700',
    };
    return (
        <div className={`rounded-xl border p-3 ${colors[color]}`}>
            <p className="text-xs font-medium opacity-60 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-base font-bold">{value}</p>
            {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

function LineRow({ description, amount, isDeduction }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-600">{description}</span>
            <span className={`text-sm tabular-nums font-medium ${isDeduction ? 'text-rose-600' : 'text-slate-800'}`}>
                {isDeduction ? `(${fmtCurrency(amount)})` : fmtCurrency(amount)}
            </span>
        </div>
    );
}

export default function PayslipDetailModal({ open, onClose, payslipId }) {
    const { data, isLoading } = useGetPayslipQuery(payslipId, { skip: !payslipId });
    const p = data?.data ?? data ?? null;

    const earnings   = p?.lines?.filter((l) => l.category === 'earning')   ?? [];
    const deductions = p?.lines?.filter((l) => l.category === 'deduction') ?? [];

    const isReleased = p?.status === 'released';
    const cutoffLabel = p?.cutoff_type === 'second' ? '2nd Cutoff' : '1st Cutoff';
    const cutoffNote  = p?.cutoff_type === 'second'
        ? 'WHT: cumulative monthly adjustment (TRAIN)'
        : 'Govt. contributions deducted at ½ monthly rate';

    const otDisplay     = fmtMinutes(p?.ot_minutes);
    const rdRegDisplay  = fmtMinutes(p?.rest_day_minutes);
    const rdOtDisplay   = fmtMinutes(p?.rest_day_ot_minutes);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={620}
            styles={{ body: { padding: 0 } }}
            destroyOnHidden
            title={null}
        >
            {isLoading || !p ? (
                <div className="py-20 text-center text-slate-400 text-sm">Loading payslip…</div>
            ) : (
                <div className="overflow-hidden rounded-xl">
                    {/* ── Gradient header ── */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 pt-6 pb-8 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Payslip</p>
                                <h2 className="mt-1 text-2xl font-extrabold leading-tight">{p.user?.name ?? '—'}</h2>
                            </div>
                            <span className={`mt-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${isReleased ? 'border-green-400 bg-green-500/20 text-green-200' : 'border-amber-400 bg-amber-500/20 text-amber-200'}`}>
                                {p.status}{p.released_at ? ` · ${p.released_at.slice(0, 10)}` : ''}
                            </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-indigo-300 text-xs uppercase tracking-wide">Period</p>
                                <p className="mt-0.5 font-semibold">{fmtDate(p.period_start)} – {fmtDate(p.period_end)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-300 text-xs uppercase tracking-wide">Pay Date</p>
                                <p className="mt-0.5 font-semibold">{p.pay_date ? fmtDate(p.pay_date) : 'TBD'}</p>
                            </div>
                            <div>
                                <p className="text-indigo-300 text-xs uppercase tracking-wide">Cutoff</p>
                                <p className="mt-0.5 font-semibold">{cutoffLabel}</p>
                                <p className="text-indigo-300 text-xs mt-0.5">{cutoffNote}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5 space-y-6">
                        {/* ── Attendance metrics ── */}
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Attendance Summary</p>
                            <div className="grid grid-cols-3 gap-2">
                                <MetricCard label="Days Worked" value={`${p.days_worked}`} sub={`of ${p.days_scheduled} scheduled`} color="green" />
                                <MetricCard label="Absences" value={`${p.days_absent} day${p.days_absent !== 1 ? 's' : ''}`} color={p.days_absent > 0 ? 'rose' : 'slate'} />
                                {p.late_minutes > 0 && (
                                    <MetricCard label="Late" value={fmtMinutes(p.late_minutes)} color="amber" />
                                )}
                                {p.undertime_minutes > 0 && (
                                    <MetricCard label="Undertime" value={fmtMinutes(p.undertime_minutes)} color="orange" />
                                )}
                                {otDisplay && (
                                    <MetricCard label="Overtime (OT)" value={otDisplay} sub="Regular workday" color="indigo" />
                                )}
                                {rdRegDisplay && (
                                    <MetricCard label="Rest Day Work" value={rdRegDisplay} sub="First 8 h · +30%" color="violet" />
                                )}
                                {rdOtDisplay && (
                                    <MetricCard label="Rest Day OT (RDOT)" value={rdOtDisplay} sub="Beyond 8 h · +69%" color="violet" />
                                )}
                            </div>
                        </div>

                        {/* ── Earnings ── */}
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Earnings</p>
                            </div>
                            <div className="px-4">
                                {earnings.map((l) => (
                                    <LineRow key={l.id} description={l.description} amount={l.amount} />
                                ))}
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 border-t border-slate-200 px-4 py-2.5">
                                <span className="text-sm font-semibold text-slate-700">Gross Pay</span>
                                <span className="text-sm font-bold text-slate-900 tabular-nums">{fmtCurrency(p.gross_pay)}</span>
                            </div>
                        </div>

                        {/* ── Deductions ── */}
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Deductions</p>
                            </div>
                            {p.cutoff_type === 'first' && (
                                <div className="mx-4 mt-3 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-xs text-sky-700">
                                    SSS, PhilHealth, Pag-IBIG and Withholding Tax are each deducted at <strong>half the monthly rate</strong> per cutoff. The 2nd cutoff uses the cumulative WHT adjustment method (TRAIN Law).
                                </div>
                            )}
                            <div className="px-4">
                                {deductions.length > 0 ? deductions.map((l) => (
                                    <LineRow key={l.id} description={l.description} amount={l.amount} isDeduction />
                                )) : (
                                    <p className="py-3 text-sm text-slate-400 text-center">No deductions this period.</p>
                                )}
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 border-t border-slate-200 px-4 py-2.5">
                                <span className="text-sm font-semibold text-slate-700">Total Deductions</span>
                                <span className="text-sm font-bold text-rose-600 tabular-nums">({fmtCurrency(p.total_deductions)})</span>
                            </div>
                        </div>

                        {/* ── Net Pay ── */}
                        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 shadow-lg">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Net Pay</p>
                                <p className="text-xs text-indigo-300 mt-0.5">Take-home this period</p>
                            </div>
                            <p className="text-3xl font-extrabold text-white tabular-nums">{fmtCurrency(p.net_pay)}</p>
                        </div>

                        {/* ── Computation notes ── */}
                        <p className="text-center text-xs text-slate-400 pb-1">
                            Daily rate: {fmtCurrency(p.daily_rate)} · Monthly salary: {fmtCurrency(p.monthly_salary)}
                            {p.taxable_income != null && ` · Taxable income (semi-monthly): ${fmtCurrency(p.taxable_income)}`}
                        </p>
                    </div>
                </div>
            )}
        </Modal>
    );
}

