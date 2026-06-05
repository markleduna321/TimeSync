// â”€â”€ THIS FILE IS NOW THE LEAVE CREDITS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Content replaced â€” Experiences feature removed per product decision.
// Leave credit utilization + transaction history lives here instead.
import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, CalendarCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useGetMyLeaveProfileQuery } from '@/features/leave/leaveApi';

const TX_TYPE = {
    credit: { icon: ArrowDownCircle, cls: 'text-emerald-500', label: 'Credited' },
    debit:  { icon: ArrowUpCircle,   cls: 'text-rose-400',    label: 'Used'     },
};

function fmtDate(d) {
    if (!d) return 'â€”';
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CreditCard({ credit }) {
    const total   = Number(credit.total_credits)  || 0;
    const used    = Number(credit.used_credits)   || 0;
    const balance = Number(credit.balance ?? (total - used)) || 0;
    const pct     = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
    const color   = credit.leave_type?.color ?? '#6366f1';

    return (
        <div className="rounded-xl border border-slate-100 bg-white p-4 hover:border-slate-200 transition">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-slate-800">{credit.leave_type?.name ?? 'â€”'}</span>
                    {credit.leave_type?.is_paid === false && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Unpaid</span>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-slate-900">{balance}</span>
                    <span className="text-xs text-slate-400 ml-1">/ {total} days left</span>
                </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                <span>{used} used</span>
                <span>{pct}% utilized</span>
            </div>
        </div>
    );
}

export default function LeaveCreditsTab() {
    const { data, isLoading } = useGetMyLeaveProfileQuery();
    const [showHistory, setShowHistory] = useState(false);

    const year         = new Date().getFullYear();
    const credits      = data?.data        ?? [];
    const transactions = data?.transactions ?? [];

    if (isLoading) return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <CalendarCheck size={16} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-700">Leave Credits â€” {year}</h3>
            </div>

            {credits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                    <CalendarCheck size={32} strokeWidth={1.2} />
                    <p className="text-sm font-medium">No leave credits assigned</p>
                    <p className="text-xs">Contact your HR admin to assign leave types.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {credits.map((c) => <CreditCard key={c.id} credit={c} />)}
                </div>
            )}

            {transactions.length > 0 && (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <button
                        onClick={() => setShowHistory((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                        <span>Transaction History ({transactions.length})</span>
                        {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {showHistory && (
                        <div className="divide-y divide-slate-50 px-4">
                            {transactions.map((tx, i) => {
                                const meta = TX_TYPE[tx.type] ?? TX_TYPE.credit;
                                const Icon = meta.icon;
                                return (
                                    <div key={i} className="flex items-center gap-3 py-3">
                                        <Icon size={15} className={`shrink-0 ${meta.cls}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-slate-700 truncate">{tx.note ?? meta.label}</p>
                                            <p className="text-[10px] text-slate-400">{fmtDate(tx.created_at)}</p>
                                        </div>
                                        <span className={`text-xs font-bold tabular-nums shrink-0 ${meta.cls}`}>
                                            {tx.type === 'credit' ? '+' : '-'}{tx.amount}d
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
