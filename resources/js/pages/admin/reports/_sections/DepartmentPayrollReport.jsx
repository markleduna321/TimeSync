import React from 'react';
import { useGetDepartmentPayrollQuery } from '@/features/reports/reportsApi';
import ReportChart from './ReportChart';
import ExcelExportButton from './ExcelExportButton';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

const COLORS = [
    'rgba(99,102,241,0.75)',
    'rgba(6,182,212,0.75)',
    'rgba(34,197,94,0.75)',
    'rgba(251,146,60,0.75)',
    'rgba(239,68,68,0.75)',
    'rgba(139,92,246,0.75)',
    'rgba(20,184,166,0.75)',
    'rgba(236,72,153,0.75)',
];

export default function DepartmentPayrollReport({ filters, onDataLoad }) {
    const { data, isLoading } = useGetDepartmentPayrollQuery(filters);

    React.useEffect(() => {
        if (data) onDataLoad?.('department_payroll', data);
    }, [data]);

    const rows = data?.rows ?? [];

    const barData = {
        labels: rows.map((r) => r.department_name),
        datasets: [
            {
                label: 'Total Gross',
                data: rows.map((r) => r.total_gross),
                backgroundColor: rows.map((_, i) => COLORS[i % COLORS.length]),
                borderRadius: 4,
            },
            {
                label: 'Total Net',
                data: rows.map((r) => r.total_net),
                backgroundColor: rows.map((_, i) => COLORS[i % COLORS.length].replace('0.75', '0.4')),
                borderRadius: 4,
            },
        ],
    };

    const EXCEL_COLS = [
        { key: 'department_name',  header: 'Department' },
        { key: 'headcount',        header: 'Headcount' },
        { key: 'total_gross',      header: 'Total Gross Pay' },
        { key: 'total_deductions', header: 'Total Deductions' },
        { key: 'total_net',        header: 'Total Net Pay' },
        { key: 'avg_net',          header: 'Avg Net Pay / Employee' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Departments</p>
                    <p className="mt-1 text-xl font-bold text-indigo-600">{rows.length}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Total Gross</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{fmtCurrency(data?.total_gross)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Total Net Pay</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-green-600">{fmtCurrency(data?.total_net)}</p>
                </div>
            </div>

            {/* Chart */}
            {rows.length > 0 && (
                <ReportChart
                    type="bar"
                    title="Payroll by Department"
                    data={barData}
                    options={{
                        indexAxis: rows.length > 5 ? 'y' : 'x',
                        scales: {
                            x: { ticks: { callback: (v) => '₱' + Number(v / 1000).toFixed(0) + 'k' } },
                        },
                        plugins: { legend: { position: 'top' } },
                    }}
                />
            )}

            {/* Table toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{rows.length} department{rows.length !== 1 ? 's' : ''}</p>
                <ExcelExportButton rows={rows} filename="department-payroll" sheetName="Dept Payroll" columns={EXCEL_COLS} />
            </div>

            {/* Table */}
            {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 gap-2">
                    <p className="text-sm text-slate-400">No department payroll data for selected filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['Department', 'Headcount', 'Total Gross', 'Total Deductions', 'Total Net', 'Avg Net / Employee'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((r) => (
                                <tr key={r.department_id ?? r.department_name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">{r.department_name}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{r.headcount}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(r.total_gross)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-rose-600">{fmtCurrency(r.total_deductions)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{fmtCurrency(r.total_net)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-indigo-700">{fmtCurrency(r.avg_net)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
