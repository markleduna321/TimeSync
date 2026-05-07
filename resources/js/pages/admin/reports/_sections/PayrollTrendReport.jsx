import React from 'react';
import { useGetPayrollTrendQuery } from '@/features/reports/reportsApi';
import ReportChart from './ReportChart';
import ExcelExportButton from './ExcelExportButton';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

export default function PayrollTrendReport({ filters, onDataLoad }) {
    const { data, isLoading } = useGetPayrollTrendQuery({ year: filters.year });

    React.useEffect(() => {
        if (data) onDataLoad?.('payroll_trend', data);
    }, [data]);

    const rows = data?.rows ?? [];

    const chartData = {
        labels: rows.map((r) => r.month_name.substring(0, 3)),
        datasets: [
            {
                label: 'Gross Pay',
                data: rows.map((r) => r.total_gross),
                borderColor: 'rgb(99,102,241)',
                backgroundColor: 'rgba(99,102,241,0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
            {
                label: 'Net Pay',
                data: rows.map((r) => r.total_net),
                borderColor: 'rgb(34,197,94)',
                backgroundColor: 'rgba(34,197,94,0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
            {
                label: 'Total Deductions',
                data: rows.map((r) => r.total_deductions),
                borderColor: 'rgb(239,68,68)',
                backgroundColor: 'rgba(239,68,68,0.05)',
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                borderDash: [4, 4],
            },
        ],
    };

    const EXCEL_COLS = [
        { key: 'month_name',        header: 'Month' },
        { key: 'payslip_count',     header: 'Payslip Count' },
        { key: 'total_gross',       header: 'Total Gross Pay' },
        { key: 'total_deductions',  header: 'Total Deductions' },
        { key: 'total_net',         header: 'Total Net Pay' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    const totalGross = rows.reduce((s, r) => s + r.total_gross, 0);
    const totalNet   = rows.reduce((s, r) => s + r.total_net, 0);
    const peakMonth  = rows.reduce((best, r) => r.total_net > (best?.total_net ?? 0) ? r : best, null);

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Annual Gross</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{fmtCurrency(totalGross)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Annual Net</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-green-600">{fmtCurrency(totalNet)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Peak Month</p>
                    <p className="mt-1 text-xl font-bold text-indigo-600">{peakMonth?.month_name ?? '—'}</p>
                </div>
            </div>

            {/* Chart */}
            <ReportChart
                type="line"
                title={`Payroll Trend — ${filters.year}`}
                data={chartData}
                options={{
                    scales: {
                        y: {
                            ticks: {
                                callback: (v) => '₱' + Number(v).toLocaleString('en-PH'),
                            },
                        },
                    },
                }}
            />

            {/* Table toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{data?.year ?? ''} — 12-month breakdown</p>
                <ExcelExportButton rows={rows} filename={`payroll-trend-${filters.year}`} sheetName="Trend" columns={EXCEL_COLS} />
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {['Month', 'Payslips', 'Total Gross', 'Total Deductions', 'Total Net Pay'].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map((r) => (
                            <tr key={r.month} className={`hover:bg-slate-50 transition-colors ${r.payslip_count === 0 ? 'opacity-40' : ''}`}>
                                <td className="px-4 py-3 font-medium text-slate-700">{r.month_name}</td>
                                <td className="px-4 py-3 text-center tabular-nums text-slate-500">{r.payslip_count}</td>
                                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(r.total_gross)}</td>
                                <td className="px-4 py-3 text-right tabular-nums text-rose-600">{fmtCurrency(r.total_deductions)}</td>
                                <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{fmtCurrency(r.total_net)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
