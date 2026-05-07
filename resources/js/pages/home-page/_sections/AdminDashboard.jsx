import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Users,
    DollarSign,
    FileText,
    AlertCircle,
    TrendingUp,
    CalendarCheck,
    ChevronRight,
    ClipboardList,
    Calendar,
} from 'lucide-react';
import { useGetAdminKpisQuery, useGetAdminActivityQuery } from '@/features/dashboard/dashboardApi';

/* ── Helpers ──────────────────────────────────────────────────────────── */
function peso(val) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 2,
    }).format(val ?? 0);
}

function initials(name) {
    return (name ?? '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

const STATUS_COLORS = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    overtime: 'bg-sky-100 text-sky-700',
    correction: 'bg-violet-100 text-violet-700',
};

/* ── KPI Card ─────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, light, text, href }) {
    const inner = (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm h-full">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${light}`}>
                <Icon size={22} className={text} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900 truncate">{value}</p>
                <p className="text-xs text-slate-400">{sub}</p>
            </div>
            {href && <ChevronRight size={16} className="shrink-0 text-slate-300" />}
        </div>
    );

    return href ? (
        <Link href={href} className="block hover:no-underline">
            {inner}
        </Link>
    ) : inner;
}

/* ── Quick Action Button ──────────────────────────────────────────────── */
function QuickAction({ label, href, icon: Icon, color, light }) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow hover:no-underline"
        >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${light}`}>
                <Icon size={20} className={color} strokeWidth={2} />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center leading-tight">{label}</span>
        </Link>
    );
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

/* ── Main Component ───────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const { data: kpis, isLoading: kpisLoading }         = useGetAdminKpisQuery(undefined, { pollingInterval: 60000 });
    const { data: activity, isLoading: activityLoading } = useGetAdminActivityQuery(undefined, { pollingInterval: 60000 });

    const kpiCards = [
        {
            label: 'Total Employees',
            value: kpisLoading ? '—' : (kpis?.total_employees ?? 0),
            sub: 'Active workforce',
            icon: Users,
            light: 'bg-indigo-50',
            text: 'text-indigo-600',
            href: '/admin/users',
        },
        {
            label: 'Gross Payroll',
            value: kpisLoading ? '—' : peso(kpis?.gross_total),
            sub: 'This month',
            icon: DollarSign,
            light: 'bg-emerald-50',
            text: 'text-emerald-600',
            href: '/admin/payroll',
        },
        {
            label: 'Net Payroll',
            value: kpisLoading ? '—' : peso(kpis?.net_total),
            sub: 'This month (after deductions)',
            icon: TrendingUp,
            light: 'bg-teal-50',
            text: 'text-teal-600',
        },
        {
            label: 'Draft Payslips',
            value: kpisLoading ? '—' : (kpis?.draft_payslips ?? 0),
            sub: kpis?.draft_payslips > 0 ? 'Awaiting release' : 'All up to date',
            icon: FileText,
            light: kpis?.draft_payslips > 0 ? 'bg-amber-50' : 'bg-slate-50',
            text: kpis?.draft_payslips > 0 ? 'text-amber-600' : 'text-slate-400',
            href: '/admin/payroll',
        },
        {
            label: 'Pending Corrections',
            value: kpisLoading ? '—' : (kpis?.pending_corrections ?? 0),
            sub: kpis?.pending_corrections > 0 ? 'Needs review' : 'All reviewed',
            icon: AlertCircle,
            light: kpis?.pending_corrections > 0 ? 'bg-rose-50' : 'bg-slate-50',
            text: kpis?.pending_corrections > 0 ? 'text-rose-600' : 'text-slate-400',
            href: '/time/attendance',
        },
        {
            label: 'Attendance Rate',
            value: kpisLoading ? '—' : `${kpis?.attendance_rate ?? 0}%`,
            sub: 'Employees clocked in this month',
            icon: CalendarCheck,
            light: 'bg-violet-50',
            text: 'text-violet-600',
            href: '/admin/reports',
        },
    ];

    const quickActions = [
        { label: 'Generate Payroll',  href: '/admin/payroll',       icon: DollarSign,    light: 'bg-emerald-50',  color: 'text-emerald-600' },
        { label: 'View Reports',      href: '/admin/reports',        icon: TrendingUp,    light: 'bg-indigo-50',   color: 'text-indigo-600'  },
        { label: 'Manage Users',      href: '/admin/users',          icon: Users,         light: 'bg-violet-50',   color: 'text-violet-600'  },
        { label: 'Attendance',        href: '/time/attendance',      icon: ClipboardList, light: 'bg-amber-50',    color: 'text-amber-600'   },
        { label: 'Holidays',          href: '/admin/holidays',       icon: Calendar,      light: 'bg-sky-50',      color: 'text-sky-600'     },
    ];

    const recentPayslips     = activity?.recent_payslips ?? [];
    const pendingCorrections = activity?.pending_corrections ?? [];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {kpiCards.map((card) => (
                    <KpiCard key={card.label} {...card} />
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {quickActions.map((a) => (
                        <QuickAction key={a.label} {...a} />
                    ))}
                </div>
            </div>

            {/* Activity Feed */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Recent Payslips */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">Recent Payslips</h3>
                        <Link href="/admin/payroll" className="text-xs text-indigo-600 hover:underline font-medium">
                            View all
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {activityLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3">
                                    <Skeleton className="h-9 w-9 rounded-full" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            ))
                        ) : recentPayslips.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-400">No released payslips yet.</p>
                        ) : (
                            recentPayslips.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                        {initials(p.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {p.cutoff_type === 'first' ? '1st Cut-off' : '2nd Cut-off'}
                                            {p.period_start && ` · ${p.period_start}`}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-slate-800">{peso(p.net_pay)}</p>
                                        <p className="text-xs text-slate-400">{p.released_at}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pending Corrections */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">Pending Corrections</h3>
                        <Link href="/time/attendance" className="text-xs text-rose-600 hover:underline font-medium">
                            Review all
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {activityLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3">
                                    <Skeleton className="h-9 w-9 rounded-full" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                            ))
                        ) : pendingCorrections.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-400">No pending corrections. All clear!</p>
                        ) : (
                            pendingCorrections.map((c) => (
                                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
                                        {initials(c.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                                        <p className="text-xs text-slate-400">{c.date}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[c.type] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {c.type}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
