import React, { useState } from 'react';
import { Tabs, Select } from 'antd';
import { BarChart3, TrendingUp, Clock, Building2, BrainCircuit } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import {
    useGetPayrollSummaryQuery,
    useGetPayrollTrendQuery,
    useGetAttendanceSummaryQuery,
    useGetContributionsSummaryQuery,
    useGetDepartmentPayrollQuery,
} from '@/features/reports/reportsApi';
import PayrollSummaryReport    from './_sections/PayrollSummaryReport';
import PayrollTrendReport      from './_sections/PayrollTrendReport';
import AttendanceReport        from './_sections/AttendanceReport';
import ContributionsReport     from './_sections/ContributionsReport';
import DepartmentPayrollReport from './_sections/DepartmentPayrollReport';
import AiInsightsPanel         from './_sections/AiInsightsPanel';

const YEAR = new Date().getFullYear();

const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' },   { value: 4, label: 'April' },
    { value: 5, label: 'May' },     { value: 6, label: 'June' },
    { value: 7, label: 'July' },    { value: 8, label: 'August' },
    { value: 9, label: 'September'},{ value: 10, label: 'October' },
    { value: 11, label: 'November'},{ value: 12, label: 'December' },
];

export default function AdminReportsPage() {
    const [filterYear,   setFilterYear]   = useState(YEAR);
    const [filterMonth,  setFilterMonth]  = useState(null);
    const [filterCutoff, setFilterCutoff] = useState(null);
    const [activeTab,    setActiveTab]    = useState('payroll_summary');

    const filters = {
        year: filterYear,
        ...(filterMonth  ? { month:       filterMonth }  : {}),
        ...(filterCutoff ? { cutoff_type: filterCutoff } : {}),
    };

    // Fetch all reports eagerly so AI Insights always has data regardless of active tab
    const { data: payrollSummaryData }  = useGetPayrollSummaryQuery(filters);
    const { data: payrollTrendData }    = useGetPayrollTrendQuery({ year: filterYear });
    const { data: attendanceData }      = useGetAttendanceSummaryQuery(filters);
    const { data: contributionsData }   = useGetContributionsSummaryQuery(filters);
    const { data: departmentData }      = useGetDepartmentPayrollQuery(filters);

    const reportDataMap = {
        ...(payrollSummaryData  ? { payroll_summary:    payrollSummaryData }  : {}),
        ...(payrollTrendData    ? { payroll_trend:      payrollTrendData }    : {}),
        ...(attendanceData      ? { attendance:         attendanceData }      : {}),
        ...(contributionsData   ? { contributions:      contributionsData }   : {}),
        ...(departmentData      ? { department_payroll: departmentData }      : {}),
    };

    const TABS = [
        {
            key: 'payroll_summary',
            label: (
                <span className="flex items-center gap-2">
                    <BarChart3 size={14} />
                    Payroll Summary
                </span>
            ),
            children: <PayrollSummaryReport filters={filters} />,
        },
        {
            key: 'payroll_trend',
            label: (
                <span className="flex items-center gap-2">
                    <TrendingUp size={14} />
                    Payroll Trend
                </span>
            ),
            children: <PayrollTrendReport filters={filters} />,
        },
        {
            key: 'attendance',
            label: (
                <span className="flex items-center gap-2">
                    <Clock size={14} />
                    Attendance
                </span>
            ),
            children: <AttendanceReport filters={filters} />,
        },
        {
            key: 'contributions',
            label: (
                <span className="flex items-center gap-2">
                    <BarChart3 size={14} />
                    Contributions
                </span>
            ),
            children: <ContributionsReport filters={filters} />,
        },
        {
            key: 'department',
            label: (
                <span className="flex items-center gap-2">
                    <Building2 size={14} />
                    By Department
                </span>
            ),
            children: <DepartmentPayrollReport filters={filters} />,
        },
        {
            key: 'ai_insights',
            label: (
                <span className="flex items-center gap-2">
                    <BrainCircuit size={14} />
                    AI Insights
                </span>
            ),
            children: <AiInsightsPanel reportDataMap={reportDataMap} />,
        },
    ];

    // AI Insights tab doesn't use period filters
    const showFilters = activeTab !== 'ai_insights';

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">Reports</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Payroll, attendance, contributions, and department analytics with Excel export and AI insights.
                </p>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-3">
                    {/* Year */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600">Year:</label>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {[YEAR - 2, YEAR - 1, YEAR, YEAR + 1].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600">Month:</label>
                        <Select
                            placeholder="All months"
                            value={filterMonth}
                            onChange={(val) => setFilterMonth(val ?? null)}
                            options={MONTHS.map((m) => ({ value: m.value, label: m.label }))}
                            allowClear
                            style={{ minWidth: 130 }}
                        />
                    </div>

                    {/* Cutoff — only relevant for payroll tabs */}
                    {['payroll_summary', 'contributions'].includes(activeTab) && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600">Cutoff:</label>
                            <Select
                                placeholder="All cutoffs"
                                value={filterCutoff}
                                onChange={(val) => setFilterCutoff(val ?? null)}
                                options={[
                                    { value: 'first',  label: '1st Cutoff (1–15)' },
                                    { value: 'second', label: '2nd Cutoff (16–EOM)' },
                                ]}
                                allowClear
                                style={{ minWidth: 170 }}
                            />
                        </div>
                    )}

                    {(filterMonth || filterCutoff) && (
                        <button
                            onClick={() => { setFilterMonth(null); setFilterCutoff(null); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={TABS}
                    size="middle"
                    destroyInactiveTabPane={false}
                />
            </div>
        </div>
    );
}

AdminReportsPage.layout = (page) => <MainLayout>{page}</MainLayout>;
