import React, { useState } from 'react';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { message } from 'antd';
import {
    useUpsertTrainingEntryMutation,
    useDeleteTrainingEntryMutation,
} from '@/features/timekeeping/attendanceApi';

/**
 * Manager-only panel embedded in DayDetailModal for logging/editing/removing
 * a training entry for a specific employee-date.
 *
 * Props:
 *   day          – the day object from the calendar API
 *   targetUserId – the user whose training is being managed
 *   onClose      – callback to close the parent DayDetailModal after save/delete
 */
export default function TrainingEntryPanel({ day, targetUserId, onClose }) {
    const existing = day?.training ?? null;

    const [upsertEntry, { isLoading: saving }]  = useUpsertTrainingEntryMutation();
    const [deleteEntry, { isLoading: deleting }] = useDeleteTrainingEntryMutation();

    const [editing,    setEditing]    = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [errors,     setErrors]     = useState({});
    const [form, setForm] = useState({
        hours:       existing?.hours != null ? String(existing.hours) : '',
        description: existing?.description ?? '',
    });

    function openEdit() {
        setForm({
            hours:       existing?.hours != null ? String(existing.hours) : '',
            description: existing?.description ?? '',
        });
        setErrors({});
        setEditing(true);
    }

    async function handleSave() {
        setErrors({});
        try {
            await upsertEntry({
                userId:      targetUserId,
                date:        day.date,
                hours:       parseFloat(form.hours),
                description: form.description.trim(),
            }).unwrap();
            message.success('Training entry saved.');
            onClose();
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setErrors({
                hours:       errs.hours?.[0],
                description: errs.description?.[0],
                date:        errs.date?.[0],
                general:     Object.keys(errs).length
                    ? null
                    : (err?.data?.message ?? 'Failed to save training entry.'),
            });
        }
    }

    async function handleDelete() {
        try {
            await deleteEntry(existing.id).unwrap();
            message.success('Training entry removed.');
            onClose();
        } catch {
            message.error('Failed to remove training entry.');
        }
    }

    return (
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 space-y-3">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-teal-600 shrink-0" />
                    <span className="text-xs font-semibold text-teal-700">Training Entry</span>
                </div>

                {existing && !editing && !confirmDel && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={openEdit}
                            className="rounded-md p-1 text-teal-400 hover:text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-400"
                            aria-label="Edit training entry"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDel(true)}
                            className="rounded-md p-1 text-teal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-400"
                            aria-label="Remove training entry"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}

                {!existing && !editing && (
                    <button
                        type="button"
                        onClick={openEdit}
                        className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-400"
                    >
                        + Log Training
                    </button>
                )}
            </div>

            {/* ── Read view ──────────────────────────────────────────── */}
            {existing && !editing && !confirmDel && (
                <div className="text-xs text-teal-700">
                    <p>
                        <span className="font-semibold">{existing.hours}h</span>
                        {' — '}
                        {existing.description}
                    </p>
                </div>
            )}

            {/* ── Delete confirmation ─────────────────────────────────── */}
            {confirmDel && (
                <div className="space-y-2">
                    <p className="text-xs text-rose-700">Remove this training entry?</p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmDel(false)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
                        >
                            {deleting ? 'Removing…' : 'Remove'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Create / edit form ─────────────────────────────────── */}
            {editing && (
                <div className="space-y-3">
                    {errors.general && (
                        <p className="text-xs text-rose-600">{errors.general}</p>
                    )}
                    {errors.date && (
                        <p className="text-xs text-rose-600">{errors.date}</p>
                    )}

                    <div>
                        <label className="mb-1 block text-xs font-medium text-teal-700">
                            Training Hours{' '}
                            <span className="text-rose-500">*</span>
                            <span className="ml-1 font-normal text-teal-400">(0.25 – 24)</span>
                        </label>
                        <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="24"
                            value={form.hours}
                            onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                            className={[
                                'w-full rounded-lg border px-3 py-2 text-sm text-slate-800',
                                'focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors',
                                errors.hours ? 'border-rose-400 bg-rose-50' : 'border-teal-200 bg-white',
                            ].join(' ')}
                        />
                        {errors.hours && (
                            <p className="mt-1 text-xs text-rose-600">{errors.hours}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-teal-700">
                            Description <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            maxLength={255}
                            placeholder="e.g. Safety training – fire drill"
                            className={[
                                'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400',
                                'focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors',
                                errors.description ? 'border-rose-400 bg-rose-50' : 'border-teal-200 bg-white',
                            ].join(' ')}
                        />
                        {errors.description && (
                            <p className="mt-1 text-xs text-rose-600">{errors.description}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
                        >
                            {saving ? 'Saving…' : existing ? 'Update Entry' : 'Log Training'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
