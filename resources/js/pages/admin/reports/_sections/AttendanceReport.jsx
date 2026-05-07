import React from 'react';
import { useGetAttendanceSummaryQuery } from '@/features/reports/reportsApi';
import ReportChart from './ReportChart';
import ExcelExportButton from './ExcelExportButton';

function fmtMinutes(m) {
    if (!m) return '0m';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function AttendanceReport({ filters, onDataLoad }) {
    const { data, isLoading } = useGetAttendanceSummaryQuery(filters);

    React.useEffect(() => {
        if (data) onDataLoad?.('attendance', data);
    }, [data]);

    const rows = data?.rows ?? [];

    const totalScheduled = data?.total_days_scheduled ?? 0;
    const totalWorked    = data?.total_days_worked ?? 0;
    const totalAbsent    = data?.total_days_absent ?? 0;

    const doughnutData = {
        labels: ['Days Worked', 'Days Absent'],
        datasets: [{
            data: [totalWorked, totalAbsent],
            backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)'],
            borderWidth: 0,
        }],
    };

    const EXCEL_COLS = [
        { key: 'employee_name',     header: 'Employee' },
        { key: 'days_scheduled',    header: 'Days Scheduled' },
        { key: 'days_worked',       header: 'Days Worked' },
        { key: 'days_absent',       header: 'Absences' },
        { key: 'late_minutes',      header: 'Late (minutes)' },
        { key: 'undertime_minutes', header: 'Undertime (minutes)' },
        { key: 'ot_minutes',        header: 'Overtime (minutes)' },
        { key: 'rest_day_minutes',  header: 'Rest Day Work (minutes)' },
        { key: 'attendance_rate',   header: 'Attendance Rate (%)' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
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
                    { label: 'Scheduled Days', value: totalScheduled, color: 'text-slate-800' },
                    { label: 'Days Worked',     value: totalWorked,    color: 'text-green-600' },
                    { label: 'Total Absences',  value: totalAbsent,    color: 'text-rose-600' },
                    { label: 'Total OT',        value: fmtMinutes(data?.total_ot_minutes), color: 'text-indigo-600' },
                ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs text-slate-500">{c.label}</p>
                        <p className={`mt-1 text-xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {(totalWorked > 0 || totalAbsent > 0) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReportChart
                        type="doughnut"
                        title="Worked vs Absent Ratio"
                        data={doughnutData}
                        options={{ plugins: { legend: { position: 'bottom' } } }}
                    />
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">
                                {totalScheduled > 0 ? ((totalWorked / totalScheduled) * 100).toFixed(1) : 0}%
                            </p>
                            <p className="mt-1 text-sm text-slate-500">Overall Attendance Rate</p>
                            <p className="text-xs text-slate-400 mt-1">{totalWorked} worked / {totalScheduled} scheduled</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table toolbar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{rows.length} employee{rows.length !== 1 ? 's' : ''}</p>
                <ExcelExportButton rows={rows} filename="attendance-summary" sheetName="Attendance" columns={EXCEL_COLS} />
            </div>

            {/* Table */}
            {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 gap-2">
                    <p className="text-sm text-slate-400">No attendance data found for the selected filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['Employee', 'Scheduled', 'Worked', 'Absent', 'Late', 'Undertime', 'OT', 'Rest Day', 'Rate'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((r) => (
                                <tr key={r.employee_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{r.employee_name}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{r.days_scheduled}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-green-600 font-medium">{r.days_worked}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-rose-600 font-medium">{r.days_absent}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-amber-600">{fmtMinutes(r.late_minutes)}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-orange-600">{fmtMinutes(r.undertime_minutes)}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-indigo-600">{fmtMinutes(r.ot_minutes)}</td>
                                    <td className="px-4 py-3 text-center tabular-nums text-violet-600">{fmtMinutes(r.rest_day_minutes)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            r.attendance_rate >= 90
                                                ? 'bg-green-50 text-green-700'
                                                : r.attendance_rate >= 75
                                                ? 'bg-amber-50 text-amber-700'
                                                : 'bg-rose-50 text-rose-700'
                                        }`}>
                                            {r.attendance_rate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
