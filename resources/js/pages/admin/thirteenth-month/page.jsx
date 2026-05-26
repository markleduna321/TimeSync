import React, { useState } from 'react';
import { Gift, AlertTriangle, CheckCircle, Loader2, Eye, Send, Trash2, RefreshCw } from 'lucide-react';
import { Modal } from 'antd';
import {
    useGetThirteenthMonthsQuery,
    useGenerateThirteenthMonthsMutation,
    useReleasePayslipMutation,
    useDeletePayslipMutation,
} from '@/features/payroll/payrollApi';
import PayslipDetailModal from '@/components/payroll/PayslipDetailModal';
import MainLayout from '@/Layouts/MainLayout';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

function fmtCurrency(val) {
    if (val == null || val === 0) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

const STATUS_STYLES = {
    draft:    'bg-amber-50 text-amber-700 border border-amber-200',
    released: 'bg-green-50 text-green-700 border border-green-200',
};

/* ── Banner ──────────────────────────────────────────────────────────── */
function Banner({ type, message, onClose }) {
    if (!message) return null;
    const styles = type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-rose-50 border-rose-200 text-rose-700';
    return (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
            {type === 'success'
                ? <CheckCircle size={16} className="mt-0.5 shrink-0" />
                : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{message}</span>
            <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
    );
}

/* ── Generate Panel ──────────────────────────────────────────────────── */
function GeneratePanel({ year, onYearChange, onGenerated }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [payDate, setPayDate]         = useState('');
    const [generate, { isLoading }]     = useGenerateThirteenthMonthsMutation();

    async function handleGenerate() {
        try {
            const result = await generate({ year, pay_date: payDate || null }).unwrap();
            setShowConfirm(false);
            onGenerated({
                type: 'success',
                message: result.message + (result.errors?.length
                    ? ' Warnings: ' + result.errors.join('; ')
                    : ''),
            });
        } catch (err) {
            setShowConfirm(false);
            onGenerated({ type: 'error', message: err?.data?.message ?? 'Generation failed. Please try again.' });
        }
    }

    return (
        <>
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {/* Year */}
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">Year</label>
                    <select
                        value={year}
                        onChange={(e) => onYearChange(Number(e.target.value))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                {/* Pay date */}
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">Pay Date (optional)</label>
                    <input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Generate button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                    <Gift size={15} />
                    Generate for All Employees — {year}
                </button>
            </div>

            {/* Confirmation modal */}
            <Modal
                open={showConfirm}
                onCancel={() => setShowConfirm(false)}
                footer={null}
                title={
                    <div className="flex items-center gap-2 text-slate-800">
                        <Gift size={16} className="text-indigo-500" />
                        Confirm 13th Month Generation
                    </div>
                }
                destroyOnHidden
            >
                <div className="mt-3 space-y-4">
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <p className="font-semibold mb-1">⚠ Before you proceed:</p>
                        <ul className="list-disc list-inside space-y-1 text-amber-700">
                            <li>This creates <strong>draft</strong> 13th month payslips for all employees who have released payslips in <strong>{year}</strong>.</li>
                            <li>Employees with an existing 13th month payslip for {year} will be skipped.</li>
                            <li>Drafts are visible to employees immediately. Release each one once finalised.</li>
                            <li>Calculation: Sum of <em>Basic Pay</em> from all released payslips in {year} ÷ 12 (PD 851 / DOLE rules)</li>
                            <li>First ₱90,000 is non-taxable per TRAIN Law (BIR).</li>
                        </ul>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                        >
                            {isLoading && <Loader2 size={14} className="animate-spin" />}
                            {isLoading ? 'Generating…' : 'Generate'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

/* ── Main Table Section ──────────────────────────────────────────────── */
function ThirteenthMonthTable({ year, onBanner }) {
    const [viewing, setViewing]     = useState(null);
    const [releasing, setReleasing] = useState(null);
    const [deleting, setDeleting]   = useState(null);

    const { data, isLoading, isFetching } = useGetThirteenthMonthsQuery({ year });
    const [release, { isLoading: releasing_ }] = useReleasePayslipMutation();
    const [destroy, { isLoading: deleting_ }]  = useDeletePayslipMutation();

    const records = data?.data ?? data ?? [];

    async function handleRelease(p) {
        try {
            await release(p.id).unwrap();
            setReleasing(null);
            onBanner({ type: 'success', message: `${p.user?.name}'s 13th month payslip released.` });
        } catch {
            onBanner({ type: 'error', message: 'Release failed. Please try again.' });
        }
    }

    async function handleDelete(p) {
        try {
            await destroy(p.id).unwrap();
            setDeleting(null);
            onBanner({ type: 'success', message: `${p.user?.name}'s 13th month payslip deleted.` });
        } catch {
            onBanner({ type: 'error', message: 'Delete failed. Please try again.' });
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <Gift size={36} className="text-slate-300 mb-3" />
                <p className="font-medium text-slate-600">No 13th month payslips for {year}</p>
                <p className="mt-1 text-sm text-slate-400">Click "Generate for All Employees" to create drafts.</p>
            </div>
        );
    }

    return (
        <>
            <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                        <tr>
                            {['Employee', '13th Month Amount', 'Non-Taxable', 'Taxable Excess', 'Pay Date', 'Status', ''].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {records.map((p) => {
                            const nonTax = p.lines?.find((l) => l.code === '13TH_NONTAX')?.amount ?? p.gross_pay;
                            const taxable = p.lines?.find((l) => l.code === '13TH_TAXABLE')?.amount ?? 0;
                            return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">{p.user?.name}</td>
                                    <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">{fmtCurrency(p.gross_pay)}</td>
                                    <td className="px-4 py-3 tabular-nums text-green-700">{fmtCurrency(nonTax)}</td>
                                    <td className="px-4 py-3 tabular-nums text-amber-700">{taxable > 0 ? fmtCurrency(taxable) : <span className="text-slate-400">—</span>}</td>
                                    <td className="px-4 py-3 text-slate-500">{p.pay_date ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[p.status] ?? ''}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setViewing(p.id)}
                                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                                            >
                                                <Eye size={12} /> Preview
                                            </button>
                                            {p.status === 'draft' && (
                                                <>
                                                    <button
                                                        onClick={() => setReleasing(p)}
                                                        className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition"
                                                    >
                                                        <Send size={12} /> Release
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleting(p)}
                                                        className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 transition"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Preview modal */}
            <PayslipDetailModal open={!!viewing} onClose={() => setViewing(null)} payslipId={viewing} />

            {/* Release confirm */}
            <Modal
                open={!!releasing}
                onCancel={() => setReleasing(null)}
                footer={null}
                title="Release 13th Month Payslip"
                destroyOnHidden
            >
                <p className="mt-2 text-sm text-slate-600">
                    Release <strong>{releasing?.user?.name}</strong>'s 13th month payslip? The employee will be notified and it becomes official.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setReleasing(null)} className="rounded-xl border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                    <button
                        onClick={() => handleRelease(releasing)}
                        disabled={releasing_}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition"
                    >
                        {releasing_ && <Loader2 size={14} className="animate-spin" />}
                        {releasing_ ? 'Releasing…' : 'Release'}
                    </button>
                </div>
            </Modal>

            {/* Delete confirm */}
            <Modal
                open={!!deleting}
                onCancel={() => setDeleting(null)}
                footer={null}
                title="Delete 13th Month Payslip"
                destroyOnHidden
            >
                <p className="mt-2 text-sm text-slate-600">
                    Delete <strong>{deleting?.user?.name}</strong>'s 13th month payslip for {year}? This cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setDeleting(null)} className="rounded-xl border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                    <button
                        onClick={() => handleDelete(deleting)}
                        disabled={deleting_}
                        className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
                    >
                        {deleting_ && <Loader2 size={14} className="animate-spin" />}
                        {deleting_ ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </Modal>
        </>
    );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function ThirteenthMonthPage() {
    const [year, setYear]     = useState(CURRENT_YEAR - 1);
    const [banner, setBanner] = useState(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                    <Gift size={20} className="text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">13th Month Pay</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Generate year-end 13th month payslips per PD 851 (DOLE) and TRAIN Law (BIR).
                        Drafts are visible to employees immediately; release each one once finalised.
                    </p>
                </div>
            </div>

            {/* Info bar */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 space-y-0.5">
                <p><strong className="text-slate-700">DOLE (PD 851):</strong> 13th Month Pay = Total Basic Salary received in a calendar year ÷ 12.</p>
                <p><strong className="text-slate-700">BIR (TRAIN Law):</strong> First ₱90,000 of 13th month pay is income tax-exempt. Excess is taxable and must be included in December withholding tax computation.</p>
            </div>

            {banner && <Banner type={banner.type} message={banner.message} onClose={() => setBanner(null)} />}

            <GeneratePanel year={year} onYearChange={setYear} onGenerated={setBanner} />

            {/* Section label */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">
                    13th Month Payslips — {year}
                </h2>
            </div>

            <ThirteenthMonthTable year={year} onBanner={setBanner} />
        </div>
    );
}

ThirteenthMonthPage.layout = (page) => <MainLayout>{page}</MainLayout>;
