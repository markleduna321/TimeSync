import React, { useState, useEffect } from 'react';
import { Modal, Spin } from 'antd';
import { Calendar } from 'lucide-react';
import {
    useCreateHolidayMutation,
    useUpdateHolidayMutation,
} from '@/features/payroll/payrollApi';

const DEFAULT_FORM = { date: '', name: '', type: 'regular', description: '' };

export default function HolidayFormModal({ open, onClose, editingHoliday }) {
    const [form, setForm]     = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});

    const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
    const [updateHoliday, { isLoading: updating }] = useUpdateHolidayMutation();
    const isLoading = creating || updating;

    useEffect(() => {
        if (!open) return;
        if (editingHoliday) {
            setForm({
                date:        editingHoliday.date        ?? '',
                name:        editingHoliday.name        ?? '',
                type:        editingHoliday.type        ?? 'regular',
                description: editingHoliday.description ?? '',
            });
        } else {
            setForm(DEFAULT_FORM);
        }
        setErrors({});
    }, [open, editingHoliday]);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        try {
            if (editingHoliday) {
                await updateHoliday({ id: editingHoliday.id, ...form }).unwrap();
            } else {
                await createHoliday(form).unwrap();
            }
            onClose();
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={
                <div className="flex items-center gap-2 text-slate-800">
                    <Calendar size={17} className="text-indigo-500" />
                    {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                </div>
            }
            destroyOnHidden
        >
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="h-date">
                        Date
                    </label>
                    <input
                        id="h-date"
                        type="date"
                        value={form.date}
                        onChange={(e) => set('date', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.date ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        disabled={isLoading}
                    />
                    {errors.date && <p className="mt-1 text-xs text-rose-600">{errors.date[0]}</p>}
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="h-name">
                        Holiday Name
                    </label>
                    <input
                        id="h-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        placeholder="e.g. New Year's Day"
                        disabled={isLoading}
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name[0]}</p>}
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="h-type">
                        Type
                    </label>
                    <select
                        id="h-type"
                        value={form.type}
                        onChange={(e) => set('type', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    >
                        <option value="regular">Regular Holiday</option>
                        <option value="special">Special Non-Working Day</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="h-desc">
                        Description <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                        id="h-desc"
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        rows={2}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Brief note about this holiday"
                        disabled={isLoading}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                        {isLoading && <Spin size="small" />}
                        {editingHoliday ? 'Save Changes' : 'Add Holiday'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
