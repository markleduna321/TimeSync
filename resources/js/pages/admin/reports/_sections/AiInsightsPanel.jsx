import React, { useState } from 'react';
import { Select, Spin } from 'antd';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { useGetAiInsightsMutation } from '@/features/reports/reportsApi';

const REPORT_OPTIONS = [
    { value: 'payroll_summary',    label: 'Payroll Summary' },
    { value: 'payroll_trend',      label: 'Payroll Trend (12-month)' },
    { value: 'attendance',         label: 'Attendance Summary' },
    { value: 'contributions',      label: 'Government Contributions' },
    { value: 'department_payroll', label: 'Department Payroll' },
];

export default function AiInsightsPanel({ reportDataMap = {} }) {
    const [reportType, setReportType] = useState(null);
    const [insight, setInsight]       = useState('');
    const [error, setError]           = useState('');

    const [getAiInsights, { isLoading }] = useGetAiInsightsMutation();

    async function handleAnalyze() {
        if (!reportType) return;
        const data = reportDataMap[reportType];
        setError('');
        setInsight('');
        try {
            const res = await getAiInsights({ report_type: reportType, data }).unwrap();
            setInsight(res.insight ?? '');
        } catch (e) {
            setError(e?.data?.error ?? 'AI analysis failed. Please try again.');
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                    <BrainCircuit size={20} className="text-violet-600" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-800">AI Payroll Insights</h3>
                    <p className="text-xs text-slate-500">Powered by OpenAI · HR analyst persona · DOLE/BIR context</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Select report to analyze</label>
                    <Select
                        placeholder="Choose a report…"
                        value={reportType}
                        onChange={setReportType}
                        options={REPORT_OPTIONS}
                        style={{ minWidth: 230 }}
                        allowClear
                    />
                </div>
                <button
                    onClick={handleAnalyze}
                    disabled={!reportType || isLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? (
                        <Spin size="small" />
                    ) : (
                        <Sparkles size={15} />
                    )}
                    Run AI Analysis
                </button>
            </div>

            {/* Note */}
            <p className="text-xs text-slate-400">
                Analysis is non-deterministic and for informational purposes only.
            </p>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {/* Result */}
            {isLoading && (
                <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 py-12">
                    <div className="flex flex-col items-center gap-3">
                        <Spin size="large" />
                        <p className="text-sm text-slate-400">Analyzing report data…</p>
                    </div>
                </div>
            )}

            {insight && !isLoading && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-violet-500" />
                        <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">AI Analysis</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                </div>
            )}

            {!insight && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 gap-3">
                    <BrainCircuit size={36} className="text-slate-300" />
                    <p className="text-sm text-slate-400">Select a report above and click "Run AI Analysis" to get insights.</p>
                </div>
            )}
        </div>
    );
}
