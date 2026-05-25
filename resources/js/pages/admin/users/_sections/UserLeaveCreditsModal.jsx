import React, { useState } from 'react';
import { Modal, Skeleton, message } from 'antd';
import { Wallet, Plus, Minus, History } from 'lucide-react';
import {
    useGetUserLeaveCreditsQuery,
    useUpsertLeaveCreditMutation,
    useGetLeaveTypesQuery,
} from '@/features/leave/leaveApi';

const UI_LOCALE   = 'en-PH';
const UI_TIMEZONE = 'Asia/Manila';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - 1 + i);

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(UI_LOCALE, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: UI_TIMEZONE,
    });
}

/* ── Credit balance row ─────────────────────────────────────────────── */
function CreditRow({ credit }) {
    const balance = parseFloat(credit.balance ?? 0);
    const used    = parseFloat(credit.used_credits ?? 0);
    const total   = parseFloat(credit.total_credits ?? 0) + parseFloat(credit.carried_over ?? 0);
    const pct     = total > 0 ? Math.max(0, Math.min(100, (balance / total) * 100)) : 0;

    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: credit.leave_type?.color ?? '#6d28d9' }}
                    />
                    <span className="text-sm font-semibold text-slate-700">{credit.leave_type?.name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums text-slate-500">
                    <span>Used: <strong className="text-rose-600">{used}</strong></span>
                    <span>Balance: <strong className={balance > 0 ? 'text-emerald-600' : 'text-slate-400'}>{balance}</strong></span>
                </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: credit.leave_type?.color ?? '#6d28d9' }}
                />
            </div>
        </div>
    );
}

/* ── Adjustment form ────────────────────────────────────────────────── */
function AdjustForm({ userId, year, leaveTypes, onDone }) {
    const [form, setForm] = useState({ leave_type_id: '', action: 'add', amount: '', note: '' });
    const [errors, setErrors] = useState({});
    const [upsert, { isLoading }] = useUpsertLeaveCreditMutation();

    async function handleSubmit() {
        setErrors({});
        if (!form.leave_type_id) { setErrors({ leave_type_id: 'Required' }); return; }
        if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
            setErrors({ amount: 'Must be a positive number' });
            return;
        }
        try {
            await upsert({ userId, leave_type_id: form.leave_type_id, year, action: form.action, amount: Number(form.amount), note: form.note }).unwrap();
            message.success('Leave credits updated.');
            setForm({ leave_type_id: '', action: 'add', amount: '', note: '' });
            onDone?.();
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setErrors({
                leave_type_id: errs.leave_type_id?.[0],
                amount: errs.amount?.[0],
                general: Object.keys(errs).length === 0 ? (err?.data?.message ?? 'Something went wrong.') : null,
            });
        }
    }

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined, general: undefined }));
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Adjust Credits</p>

            {errors.general && (
                <p className="text-xs text-rose-600">{errors.general}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
                {/* Leave type */}
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type <span className="text-rose-500">*</span></label>
                    <select
                        value={form.leave_type_id}
                        onChange={(e) => set('leave_type_id', e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.leave_type_id ? 'border-rose-300' : 'border-slate-200'}`}
                    >
                        <option value="">Select type...</option>
                        {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {errors.leave_type_id && <p className="mt-1 text-xs text-rose-600">{errors.leave_type_id}</p>}
                </div>

                {/* Action */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
                    <div className="flex rounded-lg border border-slate-200 p-0.5">
                        {[{ value: 'add', label: 'Add', icon: Plus }, { value: 'set', label: 'Set', icon: null }].map(({ value, label }) => (
                            <button key={value} type="button"
                                onClick={() => set('action', value)}
                                className={[
                                    'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors',
                                    form.action === value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
                                ].join(' ')}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Amount <span className="text-rose-500">*</span></label>
                    <input
                        type="number" min="0" step="0.5" value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                        placeholder="e.g. 6"
                        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.amount ? 'border-rose-300' : 'border-slate-200'}`}
                    />
                    {errors.amount && <p className="mt-1 text-xs text-rose-600">{errors.amount}</p>}
                </div>
            </div>

            {/* Note */}
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
                <input type="text" value={form.note}
                    onChange={(e) => set('note', e.target.value)}
                    placeholder="Reason for adjustment (optional)"
                    maxLength={255}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
            </div>

            <div className="flex justify-end">
                <button type="button" onClick={handleSubmit} disabled={isLoading}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
                    {isLoading ? 'Saving...' : 'Apply Adjustment'}
                </button>
            </div>
        </div>
    );
}

/* ── Transaction history ────────────────────────────────────────────── */
function TransactionList({ transactions = [] }) {
    if (!transactions.length) {
        return <p className="text-center text-xs text-slate-400 py-4">No transactions yet.</p>;
    }

    return (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {transactions.map((tx) => (
                <div key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${tx.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-medium text-slate-700">
                            {tx.leave_type?.name ?? '—'}
                        </span>
                        {tx.note && (
                            <span className="text-slate-400 truncate max-w-[140px]" title={tx.note}>{tx.note}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 tabular-nums shrink-0">
                        <span className={`font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </span>
                        <span className="text-slate-400">{fmtDate(tx.created_at)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Main Modal ─────────────────────────────────────────────────────── */
export default function UserLeaveCreditsModal({ open, onClose, user }) {
    const [year, setYear] = useState(CURRENT_YEAR);

    const { data, isLoading, refetch } = useGetUserLeaveCreditsQuery(
        { userId: user?.id, year },
        { skip: !user?.id || !open },
    );
    const { data: typesData } = useGetLeaveTypesQuery(undefined, { skip: !open });

    const credits      = data?.data         ?? [];
    const transactions = data?.transactions ?? [];
    const leaveTypes   = typesData?.data    ?? [];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-violet-600" />
                    <span className="font-semibold text-slate-800">
                        Leave Credits — {user?.name ?? ''}
                    </span>
                </div>
            }
            footer={null}
            width={520}
            destroyOnClose
        >
            <div className="space-y-4 py-2">
                {/* Year selector */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-slate-600">Year:</label>
                    <div className="flex gap-1">
                        {YEAR_OPTIONS.map((y) => (
                            <button key={y} type="button"
                                onClick={() => setYear(y)}
                                className={[
                                    'rounded-lg border px-3 py-1 text-xs font-semibold transition-colors',
                                    year === y ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100',
                                ].join(' ')}>
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Credit balances */}
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2].map((i) => <Skeleton key={i} active paragraph={{ rows: 1 }} />)}
                    </div>
                ) : credits.length > 0 ? (
                    <div className="space-y-2">
                        {credits.map((c) => <CreditRow key={c.id} credit={c} />)}
                    </div>
                ) : (
                    <p className="text-center text-sm text-slate-400 py-4">
                        No credit records for {year}.
                    </p>
                )}

                {/* Adjustment form */}
                <AdjustForm userId={user?.id} year={year} leaveTypes={leaveTypes} onDone={refetch} />

                {/* Transaction history */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <History size={14} className="text-slate-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Transactions</p>
                    </div>
                    <TransactionList transactions={transactions} />
                </div>
            </div>
        </Modal>
    );
}
