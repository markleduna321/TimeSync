import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Modal } from 'antd';
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
import {
    useGetHolidaysQuery,
    useDeleteHolidayMutation,
} from '@/features/payroll/payrollApi';
import HolidayFormModal from './_sections/HolidayFormModal';

const YEAR = new Date().getFullYear();

const TYPE_BADGE = {
    regular: 'bg-red-50 text-red-600 border border-red-200',
    special: 'bg-amber-50 text-amber-600 border border-amber-200',
};

export default function AdminHolidaysPage() {
    const [year, setYear]                   = useState(YEAR);
    const [modalOpen, setModalOpen]         = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);

    const { data, isLoading } = useGetHolidaysQuery({ year });
    const [deleteHoliday, { isLoading: deleting }] = useDeleteHolidayMutation();

    const holidays = data?.data ?? [];

    function openCreate() {
        setEditingHoliday(null);
        setModalOpen(true);
    }

    function openEdit(h) {
        setEditingHoliday(h);
        setModalOpen(true);
    }

    function confirmDelete(h) {
        Modal.confirm({
            title: 'Delete Holiday',
            content: `Remove "${h.name}" from the holiday list?`,
            okText: 'Delete',
            okButtonProps: { danger: true, loading: deleting },
            cancelText: 'Cancel',
            onOk: () => deleteHoliday(h.id),
        });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Holidays</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Manage regular and special non-working holidays for payroll computation.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <Plus size={15} />
                    Add Holiday
                </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Year:</label>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {[YEAR - 1, YEAR, YEAR + 1].map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                        Loading holidays…
                    </div>
                ) : holidays.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Calendar size={32} className="text-slate-300" />
                        <p className="text-sm text-slate-400">No holidays found for {year}.</p>
                        <button
                            onClick={openCreate}
                            className="text-sm text-indigo-600 hover:underline font-medium"
                        >
                            Add the first one
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-left font-medium text-slate-500">Date</th>
                                <th className="px-5 py-3 text-left font-medium text-slate-500">Name</th>
                                <th className="px-5 py-3 text-left font-medium text-slate-500">Type</th>
                                <th className="px-5 py-3 text-left font-medium text-slate-500">Description</th>
                                <th className="px-5 py-3 text-right font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {holidays.map((h) => (
                                <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-mono text-slate-700">{h.date}</td>
                                    <td className="px-5 py-3 font-medium text-slate-800">{h.name}</td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TYPE_BADGE[h.type] ?? ''}`}>
                                            {h.type === 'regular' ? 'Regular' : 'Special'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{h.description ?? '—'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button
                                                onClick={() => openEdit(h)}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(h)}
                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <HolidayFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editingHoliday={editingHoliday}
            />
        </div>
    );
}

AdminHolidaysPage.layout = (page) => <MainLayout>{page}</MainLayout>;
