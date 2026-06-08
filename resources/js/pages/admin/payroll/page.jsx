import React, { useState, useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Plus, Users } from 'lucide-react';
import { Select } from 'antd';
import {
    useGetPayslipsQuery,
    useReleasePayslipMutation,
    useDeletePayslipMutation,
} from '@/features/payroll/payrollApi';
import { useGetUsersQuery } from '@/features/users/usersApi';
import PayslipTable          from './_sections/PayslipTable';
import PayslipGenerateModal  from './_sections/PayslipGenerateModal';
import BulkDraftModal        from './_sections/BulkDraftModal';
import BulkReleaseModal      from './_sections/BulkReleaseModal';
import MethodToggle          from './_sections/MethodToggle';
import PayslipDetailModal    from '@/components/payroll/PayslipDetailModal';

const METHOD_STORAGE_KEY = 'payrollMethod';
const ALLOWED_METHODS = ['days_worked', 'flat_rate'];
function readStoredMethod() {
    try {
        const v = localStorage.getItem(METHOD_STORAGE_KEY);
        return ALLOWED_METHODS.includes(v) ? v : 'days_worked';
    } catch {
        return 'days_worked';
    }
}

const YEAR = new Date().getFullYear();

const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' },   { value: 4, label: 'April' },
    { value: 5, label: 'May' },     { value: 6, label: 'June' },
    { value: 7, label: 'July' },    { value: 8, label: 'August' },
    { value: 9, label: 'September'},{ value: 10, label: 'October' },
    { value: 11, label: 'November'},{ value: 12, label: 'December' },
];

export default function AdminPayrollPage() {
    const [filterYear, setFilterYear]         = useState(YEAR);
    const [filterMonth, setFilterMonth]       = useState(null);
    const [filterCutoff, setFilterCutoff]     = useState(null);
    const [filterUserId, setFilterUserId]     = useState(null);
    const [page, setPage]                     = useState(1);

    const [generateOpen, setGenerateOpen]   = useState(false);
    const [bulkOpen, setBulkOpen]           = useState(false);
    const [bulkReleaseOpen, setBulkReleaseOpen] = useState(false);
    const [viewingPayslip, setViewingPayslip] = useState(null);

    const [selectedIds, setSelectedIds]     = useState([]);

    const [releasingId, setReleasingId]     = useState(null);
    const [deletingId, setDeletingId]       = useState(null);

    // Payroll method — persisted across reloads so admins don't have to
    // re-pick the method every visit. Drives both single Generate and Bulk Draft.
    const [payrollMethod, setPayrollMethod] = useState(readStoredMethod);
    useEffect(() => {
        try { localStorage.setItem(METHOD_STORAGE_KEY, payrollMethod); } catch {}
    }, [payrollMethod]);

    const params = { page, year: filterYear };
    if (filterUserId) params.user_id = filterUserId;
    if (filterMonth)  params.month   = filterMonth;
    if (filterCutoff) params.cutoff_type = filterCutoff;

    const hasFilters = !!filterUserId || !!filterMonth || !!filterCutoff;

    const { data, isLoading }    = useGetPayslipsQuery(params);
    const { data: usersData }    = useGetUsersQuery({ per_page: 500 });
    const [releasePayslip]       = useReleasePayslipMutation();
    const [deletePayslip]        = useDeletePayslipMutation();

    const payslips = data?.data ?? [];
    const meta     = data?.meta ?? {};
    const users    = usersData?.data ?? [];

    const userOptions = users.map((u) => ({ value: u.id, label: u.name, email: u.email }));

    async function handleRelease(id) {
        setReleasingId(id);
        try { await releasePayslip(id).unwrap(); }
        finally { setReleasingId(null); }
    }

    async function handleDelete(id) {
        setDeletingId(id);
        try { await deletePayslip(id).unwrap(); }
        finally { setDeletingId(null); }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Payroll</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Generate, review, and release employee payslips.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Method toggle — drives both single Generate and Bulk Draft. */}
                    <MethodToggle value={payrollMethod} onChange={setPayrollMethod} />
                    <button
                        onClick={() => setBulkOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                        <Users size={15} />
                        Bulk Draft
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => setBulkReleaseOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                        >
                            Release Selected ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={() => setGenerateOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                        <Plus size={15} />
                        Generate Payslip
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Year */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Year:</label>
                    <select
                        value={filterYear}
                        onChange={(e) => { setFilterYear(Number(e.target.value)); setPage(1); }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {[YEAR - 1, YEAR, YEAR + 1].map((y) => (
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
                        onChange={(val) => { setFilterMonth(val ?? null); setPage(1); }}
                        options={MONTHS.map((m) => ({ value: m.value, label: m.label }))}
                        allowClear
                        style={{ minWidth: 130 }}
                    />
                </div>

                {/* Cutoff */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Cutoff:</label>
                    <Select
                        placeholder="All cutoffs"
                        value={filterCutoff}
                        onChange={(val) => { setFilterCutoff(val ?? null); setPage(1); }}
                        options={[
                            { value: 'first',  label: '1st Cutoff (1–15)' },
                            { value: 'second', label: '2nd Cutoff (16–EOM)' },
                        ]}
                        allowClear
                        style={{ minWidth: 170 }}
                    />
                </div>

                {/* Employee */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Employee:</label>
                    <Select
                        placeholder="All employees"
                        value={filterUserId}
                        onChange={(val) => { setFilterUserId(val ?? null); setPage(1); }}
                        options={userOptions}
                        allowClear
                        showSearch
                        filterOption={(input, option) => {
                            const q = input.toLowerCase();
                            return (
                                (option?.label ?? '').toLowerCase().includes(q) ||
                                (option?.email ?? '').toLowerCase().includes(q)
                            );
                        }}
                        optionRender={(option) => (
                            <div>
                                <p className="text-sm font-medium text-slate-800">{option.data.label}</p>
                                <p className="text-xs text-slate-400">{option.data.email}</p>
                            </div>
                        )}
                        style={{ minWidth: 220 }}
                        popupMatchSelectWidth={false}
                    />
                </div>

                {hasFilters && (
                    <button
                        onClick={() => { setFilterUserId(null); setFilterMonth(null); setFilterCutoff(null); setPage(1); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <PayslipTable
                    payslips={payslips}
                    isLoading={isLoading}
                    onView={setViewingPayslip}
                    onRelease={handleRelease}
                    onDelete={handleDelete}
                    releasingId={releasingId}
                    deletingId={deletingId}
                    selectedIds={selectedIds}
                    onSelectChange={setSelectedIds}
                />
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >Previous</button>
                        <button
                            disabled={page >= meta.last_page}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >Next</button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <BulkDraftModal
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                method={payrollMethod}
            />
            <BulkReleaseModal
                open={bulkReleaseOpen}
                onClose={() => setBulkReleaseOpen(false)}
                selectedPayslips={payslips.filter((p) => selectedIds.includes(p.id))}
                onSuccess={() => setSelectedIds([])}
            />
            <PayslipGenerateModal
                open={generateOpen}
                onClose={() => setGenerateOpen(false)}
                method={payrollMethod}
            />
            <PayslipDetailModal
                open={!!viewingPayslip}
                onClose={() => setViewingPayslip(null)}
                payslipId={viewingPayslip?.id}
            />
        </div>
    );
}

AdminPayrollPage.layout = (page) => <MainLayout>{page}</MainLayout>;

