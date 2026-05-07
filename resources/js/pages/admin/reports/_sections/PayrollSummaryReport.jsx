import React from 'react';
import { useGetPayrollSummaryQuery } from '@/features/reports/reportsApi';
import ReportChart from './ReportChart';
import ExcelExportButton from './ExcelExportButton';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

const CUTOFF_BADGE = {
    first:  'bg-sky-50 text-sky-600 border border-sky-200',
    second: 'bg-violet-50 text-violet-600 border border-violet-200',
};

const STATUS_BADGE = {
    draft:    'bg-amber-50 text-amber-600 border border-amber-200',
    released: 'bg-green-50 text-green-600 border border-green-200',
};

export default function PayrollSummaryReport({ filters, onDataLoad }) {
    const { data, isLoading, isFetching } = useGetPayrollSummaryQuery(filters);

    React.useEffect(() => {
        if (data) onDataLoad?.('payroll_summary', data);
    }, [data]);

    const rows = data?.rows ?? [];

    // Chart: gross vs net per employee (top 10)
    const top10 = rows.slice(0, 10);
    const chartData = {
        labels: top10.map((r) => r.employee_name.split(' ').slice(-1)[0]),
        datasets: [
            {
                label: 'Gross Pay',
                data: top10.map((r) => r.gross_pay),
                backgroundColor: 'rgba(99,102,241,0.7)',
                borderRadius: 4,
            },
            {
                label: 'Net Pay',
                data: top10.map((r) => r.net_pay),
                backgroundColor: 'rgba(34,197,94,0.7)',
                borderRadius: 4,
            },
        ],
    };

    const EXCEL_COLS = [
        { key: 'employee_name',    header: 'Employee' },
        { key: 'period_start',     header: 'Period Start' },
        { key: 'period_end',       header: 'Period End' },
        { key: 'cutoff_type',      header: 'Cutoff' },
        { key: 'status',           header: 'Status' },
        { key: 'monthly_salary',   header: 'Monthly Salary' },
        { key: 'basic_pay',        header: 'Basic Pay' },
        { key: 'gross_pay',        header: 'Gross Pay' },
        { key: 'total_deductions', header: 'Total Deductions' },
        { key: 'net_pay',          header: 'Net Pay' },
        { key: 'days_worked',      header: 'Days Worked' },
        { key: 'days_absent',      header: 'Days Absent' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { label: 'Headcount', value: data?.headcount ?? 0, color: 'text-indigo-600' },
                    { label: 'Total Gross', value: fmtCurrency(data?.total_gross), color: 'text-slate-800' },
                    { label: 'Total Deductions', value: fmtCurrency(data?.total_deductions), color: 'text-rose-600' },
                    { label: 'Total Net Pay', value: fmtCurrency(data?.total_net), color: 'text-green-600' },
                ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs text-slate-500">{c.label}</p>
                        <p className={`mt-1 text-xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {top10.length > 0 && (
                <ReportChart
                    type="bar"
                    title="Gross vs Net Pay (Top 10 Employees)"
                    data={chartData}
                    options={{ plugins: { legend: { position: 'top' } } }}
                />
            )}

            {/* Table toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{rows.length} record{rows.length !== 1 ? 's' : ''}</p>
                <ExcelExportButton rows={rows} filename="payroll-summary" sheetName="Payroll Summary" columns={EXCEL_COLS} />
            </div>

            {/* Table */}
            {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 gap-2">
                    <p className="text-sm text-slate-400">No payslips found for the selected filters.</p>
                    <p className="text-xs text-slate-400">Try adjusting the year, month, or cutoff filter.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['Employee', 'Period', 'Cutoff', 'Status', 'Gross Pay', 'Deductions', 'Net Pay', 'Days Worked', 'Absences'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{r.employee_name}</td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{r.period_start}<br />{r.period_end}</td>
                                    <td className="px-4 py-3">
                                        {r.cutoff_type && (
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CUTOFF_BADGE[r.cutoff_type] ?? ''}`}>
                                                {r.cutoff_type === 'first' ? '1st' : '2nd'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[r.status] ?? ''}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(r.gross_pay)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-rose-600">{fmtCurrency(r.total_deductions)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">{fmtCurrency(r.net_pay)}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{r.days_worked}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-rose-500">{r.days_absent}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
