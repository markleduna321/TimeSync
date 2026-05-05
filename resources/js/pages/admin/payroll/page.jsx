import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Plus } from 'lucide-react';
import {
    useGetPayslipsQuery,
    useReleasePayslipMutation,
    useDeletePayslipMutation,
} from '@/features/payroll/payrollApi';
import { useGetUsersQuery } from '@/features/users/usersApi';
import PayslipTable          from './_sections/PayslipTable';
import PayslipGenerateModal  from './_sections/PayslipGenerateModal';
import PayslipDetailModal    from '@/components/payroll/PayslipDetailModal';

const YEAR = new Date().getFullYear();

export default function AdminPayrollPage() {
    const [filterYear, setFilterYear]       = useState(YEAR);
    const [filterUserId, setFilterUserId]   = useState('');
    const [page, setPage]                   = useState(1);

    const [generateOpen, setGenerateOpen]   = useState(false);
    const [viewingPayslip, setViewingPayslip] = useState(null);

    const [releasingId, setReleasingId]     = useState(null);
    const [deletingId, setDeletingId]       = useState(null);

    const params = { page, year: filterYear };
    if (filterUserId) params.user_id = filterUserId;

    const { data, isLoading }    = useGetPayslipsQuery(params);
    const { data: usersData }    = useGetUsersQuery({ per_page: 200 });
    const [releasePayslip]       = useReleasePayslipMutation();
    const [deletePayslip]        = useDeletePayslipMutation();

    const payslips = data?.data ?? [];
    const meta     = data?.meta ?? {};
    const users    = usersData?.data ?? [];

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
                <button
                    onClick={() => setGenerateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <Plus size={15} />
                    Generate Payslip
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
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
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Employee:</label>
                    <select
                        value={filterUserId}
                        onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All employees</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
                {filterUserId && (
                    <button
                        onClick={() => { setFilterUserId(''); setPage(1); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Clear filter
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

            {/* Modals & Drawers */}
            <PayslipGenerateModal
                open={generateOpen}
                onClose={() => setGenerateOpen(false)}
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
