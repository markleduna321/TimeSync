import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { FileText } from 'lucide-react';
import { useGetPayslipsQuery } from '@/features/payroll/payrollApi';
import PayslipDetailModal from '@/components/payroll/PayslipDetailModal';

const YEAR = new Date().getFullYear();

const STATUS_BADGE = {
    draft:    'bg-amber-50 text-amber-600 border border-amber-200',
    released: 'bg-green-50 text-green-600 border border-green-200',
};

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function MyPayslipsPage() {
    const [year, setYear]               = useState(YEAR);
    const [page, setPage]               = useState(1);
    const [viewingPayslip, setViewing]  = useState(null);

    const { data, isLoading } = useGetPayslipsQuery({ year, page });
    const payslips = data?.data ?? [];
    const meta     = data?.meta ?? {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">My Payslips</h1>
                <p className="mt-0.5 text-sm text-slate-500">View your payslips. Drafts are visible before final release so you can check and file corrections.</p>
            </div>

            {/* Year filter */}
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Year:</label>
                <select
                    value={year}
                    onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {[YEAR - 1, YEAR, YEAR + 1].map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Card list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                    Loading payslips…
                </div>
            ) : payslips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <FileText size={32} className="text-slate-300" />
                    <p className="text-sm text-slate-400">No payslips found for {year}.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {payslips.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setViewing(p)}
                            className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {p.period_start} → {p.period_end}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Pay date: {p.pay_date ?? 'TBD'} &middot; {p.days_worked} days worked
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                                        {fmtCurrency(p.net_pay)}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[p.status] ?? ''}`}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-50 pt-3 text-xs text-slate-500">
                                <span>Basic: <strong className="text-slate-700">{fmtCurrency(p.basic_pay)}</strong></span>
                                <span>Gross: <strong className="text-slate-700">{fmtCurrency(p.gross_pay)}</strong></span>
                                <span>Deductions: <strong className="text-rose-600">({fmtCurrency(p.total_deductions)})</strong></span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta.last_page > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >Previous</button>
                        <button
                            disabled={page >= meta.last_page}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >Next</button>
                    </div>
                </div>
            )}

            <PayslipDetailModal
                open={!!viewingPayslip}
                onClose={() => setViewing(null)}
                payslipId={viewingPayslip?.id}
            />
        </div>
    );
}

MyPayslipsPage.layout = (page) => <MainLayout>{page}</MainLayout>;
