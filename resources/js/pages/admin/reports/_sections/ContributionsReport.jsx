import React from 'react';
import { useGetContributionsSummaryQuery } from '@/features/reports/reportsApi';
import ReportChart from './ReportChart';
import ExcelExportButton from './ExcelExportButton';

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

const CONTRIB_COLORS = {
    SSS:             'rgba(99,102,241,0.75)',
    SSS_WISP:        'rgba(139,92,246,0.75)',
    PHILHEALTH:      'rgba(6,182,212,0.75)',
    PAGIBIG:         'rgba(34,197,94,0.75)',
    WITHHOLDING_TAX: 'rgba(239,68,68,0.75)',
};

export default function ContributionsReport({ filters, onDataLoad }) {
    const { data, isLoading } = useGetContributionsSummaryQuery(filters);

    React.useEffect(() => {
        if (data) onDataLoad?.('contributions', data);
    }, [data]);

    const summary = data?.summary ?? [];

    // Doughnut: total per contribution type
    const doughnutData = {
        labels: summary.map((r) => r.label),
        datasets: [{
            data: summary.map((r) => r.total),
            backgroundColor: summary.map((r) => CONTRIB_COLORS[r.code] ?? 'rgba(148,163,184,0.7)'),
            borderWidth: 0,
        }],
    };

    // Bar: per period grouped by contribution type
    const byPeriod  = data?.by_period ?? {};
    const periods   = Object.keys(byPeriod).sort();
    const codes     = ['SSS', 'PHILHEALTH', 'PAGIBIG', 'WITHHOLDING_TAX'];
    const codeLabels = { SSS: 'SSS', PHILHEALTH: 'PhilHealth', PAGIBIG: 'Pag-IBIG', WITHHOLDING_TAX: 'WHT' };

    const barData = {
        labels: periods,
        datasets: codes.map((code) => ({
            label: codeLabels[code],
            data: periods.map((p) => parseFloat(byPeriod[p]?.[code] ?? 0)),
            backgroundColor: CONTRIB_COLORS[code],
            borderRadius: 3,
        })),
    };

    const EXCEL_COLS = [
        { key: 'label', header: 'Contribution Type' },
        { key: 'total', header: 'Total Amount' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {summary.map((r) => (
                    <div key={r.code} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs text-slate-500">{r.label}</p>
                        <p className="mt-1 text-base font-bold tabular-nums text-slate-800">{fmtCurrency(r.total)}</p>
                    </div>
                ))}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                    <p className="text-xs text-indigo-600 font-medium">Grand Total</p>
                    <p className="mt-1 text-base font-bold tabular-nums text-indigo-700">{fmtCurrency(data?.grand_total)}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {summary.length > 0 && (
                    <ReportChart
                        type="doughnut"
                        title="Contribution Mix"
                        data={doughnutData}
                        options={{ plugins: { legend: { position: 'bottom' } } }}
                    />
                )}
                {periods.length > 0 && (
                    <ReportChart
                        type="bar"
                        title="Contributions by Period"
                        data={barData}
                        options={{
                            scales: { x: { stacked: false }, y: { stacked: false } },
                            plugins: { legend: { position: 'bottom' } },
                        }}
                    />
                )}
            </div>

            {/* Table toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Contribution type summary</p>
                <ExcelExportButton rows={summary} filename="contributions-summary" sheetName="Contributions" columns={EXCEL_COLS} />
            </div>

            {/* Table */}
            {summary.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 gap-2">
                    <p className="text-sm text-slate-400">No contribution data found for the selected filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Contribution Type</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Total (Period)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">% of Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {summary.map((r) => (
                                <tr key={r.code} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">{r.label}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">{fmtCurrency(r.total)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                        {data?.grand_total > 0
                                            ? ((r.total / data.grand_total) * 100).toFixed(1) + '%'
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-indigo-50">
                                <td className="px-4 py-3 font-bold text-indigo-700">Grand Total</td>
                                <td className="px-4 py-3 text-right tabular-nums font-bold text-indigo-700">{fmtCurrency(data?.grand_total)}</td>
                                <td className="px-4 py-3 text-right text-indigo-600 font-semibold">100%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
