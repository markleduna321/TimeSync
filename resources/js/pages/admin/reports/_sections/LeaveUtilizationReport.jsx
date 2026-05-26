import React, { useState } from 'react';
import { useGetLeaveUtilizationQuery } from '@/features/reports/reportsApi';
import ExcelExportButton from './ExcelExportButton';
import { CalendarCheck, Users, FileBarChart2 } from 'lucide-react';

function UtilizationBar({ pct, color }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 rounded-full bg-slate-100 h-2 overflow-hidden">
                <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color || '#6366f1' }}
                />
            </div>
            <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
        </div>
    );
}

const EXCEL_EMPLOYEE_COLS = [
    { key: 'user_name',        header: 'Employee' },
    { key: 'leave_type_name',  header: 'Leave Type' },
    { key: 'total_credits',    header: 'Total Credits' },
    { key: 'used_credits',     header: 'Used' },
    { key: 'balance',          header: 'Balance' },
    { key: 'utilization_pct',  header: 'Utilization %' },
    { key: 'approved',         header: 'Approved' },
    { key: 'rejected',         header: 'Rejected' },
    { key: 'cancelled',        header: 'Cancelled' },
    { key: 'pending',          header: 'Pending' },
];

const EXCEL_TYPE_COLS = [
    { key: 'leave_type_name', header: 'Leave Type' },
    { key: 'total_filed',     header: 'Total Filed' },
    { key: 'approved',        header: 'Approved' },
    { key: 'rejected',        header: 'Rejected' },
    { key: 'cancelled',       header: 'Cancelled' },
    { key: 'pending',         header: 'Pending' },
    { key: 'total_days_used', header: 'Total Days Used' },
];

export default function LeaveUtilizationReport({ filters, onDataLoad }) {
    const { data, isLoading } = useGetLeaveUtilizationQuery(filters);
    const [view, setView]     = useState('employee'); // 'employee' | 'by_type'
    const [search, setSearch] = useState('');

    React.useEffect(() => {
        if (data) onDataLoad?.('leave_utilization', data);
    }, [data]);

    const rows    = data?.rows    ?? [];
    const byType  = data?.by_type ?? [];
    const summary = data?.summary ?? {};

    const filteredRows = rows.filter((r) =>
        r.user_name.toLowerCase().includes(search.toLowerCase()) ||
        r.leave_type_name.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    const summaryCards = [
        { label: 'Employees with Leave',  value: summary.total_employees   ?? 0, icon: Users },
        { label: 'Total Applications',    value: summary.total_applications ?? 0, icon: FileBarChart2 },
        { label: 'Approved',              value: summary.approved           ?? 0, icon: CalendarCheck, color: 'text-green-600' },
        { label: 'Total Days Used',       value: summary.total_days_used    ?? 0, icon: CalendarCheck, color: 'text-indigo-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {summaryCards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs text-slate-500">{c.label}</p>
                        <p className={`mt-1 text-2xl font-bold ${c.color ?? 'text-slate-800'}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* View toggle + search + export */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                    {[{ key: 'employee', label: 'By Employee' }, { key: 'by_type', label: 'By Leave Type' }].map((v) => (
                        <button
                            key={v.key}
                            onClick={() => setView(v.key)}
                            className={[
                                'px-4 py-1.5 transition-colors',
                                view === v.key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {view === 'employee' && (
                        <input
                            type="text"
                            placeholder="Search employee or leave type…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    )}
                    <ExcelExportButton
                        data={view === 'employee' ? filteredRows : byType}
                        columns={view === 'employee' ? EXCEL_EMPLOYEE_COLS : EXCEL_TYPE_COLS}
                        filename={`leave-utilization-${view}-${filters.year}`}
                    />
                </div>
            </div>

            {/* By Employee table */}
            {view === 'employee' && (
                <>
                    {filteredRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
                            <CalendarCheck size={36} className="text-slate-300 mb-3" />
                            <p className="font-medium text-slate-600">No leave credits assigned for this period</p>
                            <p className="mt-1 text-sm text-slate-400">Assign leave types to employees via the Users page.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Employee', 'Leave Type', 'Credits', 'Used', 'Balance', 'Utilization', 'Filed', 'Approved', 'Rejected', 'Pending'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{row.user_name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.leave_type_color }} />
                                                    {row.leave_type_name}
                                                    {row.is_paid && <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Paid</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{row.total_credits}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.used_credits}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-800">{row.balance}</td>
                                            <td className="px-4 py-3 min-w-[140px]">
                                                <UtilizationBar pct={row.utilization_pct} color={row.leave_type_color} />
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{row.filed}</td>
                                            <td className="px-4 py-3 text-green-600 font-medium">{row.approved}</td>
                                            <td className="px-4 py-3 text-red-500">{row.rejected}</td>
                                            <td className="px-4 py-3 text-amber-500">{row.pending}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* By Leave Type table */}
            {view === 'by_type' && (
                <>
                    {byType.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
                            <FileBarChart2 size={36} className="text-slate-300 mb-3" />
                            <p className="font-medium text-slate-600">No leave type data for this period</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Leave Type', 'Paid?', 'Filed', 'Approved', 'Rejected', 'Cancelled', 'Pending', 'Days Used'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {byType.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                                                    {row.leave_type_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.is_paid
                                                    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Yes</span>
                                                    : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">No</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{row.total_filed}</td>
                                            <td className="px-4 py-3 text-green-600 font-medium">{row.approved}</td>
                                            <td className="px-4 py-3 text-red-500">{row.rejected}</td>
                                            <td className="px-4 py-3 text-slate-500">{row.cancelled}</td>
                                            <td className="px-4 py-3 text-amber-500">{row.pending}</td>
                                            <td className="px-4 py-3 font-semibold text-indigo-700">{row.total_days_used}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
