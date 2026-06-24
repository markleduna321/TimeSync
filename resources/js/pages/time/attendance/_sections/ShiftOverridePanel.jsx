import React, { useState } from 'react';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { message } from 'antd';
import {
    useUpsertScheduleOverrideMutation,
    useDeleteScheduleOverrideMutation,
} from '@/features/timekeeping/attendanceApi';

function fmtLocalTime(timeStr) {
    if (!timeStr) return '—';
    return new Date('1970-01-01T' + timeStr).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

/**
 * Manager-only panel embedded in DayDetailModal for setting/editing/removing
 * a shift override on a specific employee-date.
 *
 * Props:
 *   day          – the day object from the calendar API
 *   targetUserId – the user whose schedule is being managed
 *   onClose      – callback to close the parent DayDetailModal after save/delete
 */
export default function ShiftOverridePanel({ day, targetUserId, onClose }) {
    const existing = day?.shift_override ?? null;

    const [upsertOverride, { isLoading: saving }]  = useUpsertScheduleOverrideMutation();
    const [deleteOverride, { isLoading: deleting }] = useDeleteScheduleOverrideMutation();

    const [editing,     setEditing]     = useState(false);
    const [confirmDel,  setConfirmDel]  = useState(false);
    const [errors,      setErrors]      = useState({});
    const [form, setForm] = useState({
        shift_start:         existing?.shift_start ?? '',
        shift_end:           existing?.shift_end   ?? '',
        promotes_to_workday: existing?.promotes_to_workday ?? false,
        note:                existing?.note ?? '',
    });

    // Reset form to match existing data (or blank) when switching modes
    function openEdit() {
        setForm({
            shift_start:         existing?.shift_start ?? '',
            shift_end:           existing?.shift_end   ?? '',
            promotes_to_workday: existing?.promotes_to_workday ?? false,
            note:                existing?.note ?? '',
        });
        setErrors({});
        setEditing(true);
    }

    async function handleSave() {
        setErrors({});
        try {
            await upsertOverride({
                userId:              targetUserId,   // route segment
                user_id:             targetUserId,   // body (required by validation)
                date:                day.date,
                shift_start:         form.shift_start,
                shift_end:           form.shift_end,
                promotes_to_workday: form.promotes_to_workday,
                ...(form.note.trim() ? { note: form.note.trim() } : { note: null }),
            }).unwrap();
            message.success('Shift override saved.');
            onClose();
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setErrors({
                shift_start:  errs.shift_start?.[0],
                shift_end:    errs.shift_end?.[0],
                note:         errs.note?.[0],
                general:      Object.keys(errs).length
                    ? null
                    : (err?.data?.message ?? 'Failed to save override.'),
            });
        }
    }

    async function handleDelete() {
        try {
            await deleteOverride(existing.id).unwrap();
            message.success('Shift override removed.');
            onClose();
        } catch {
            message.error('Failed to remove shift override.');
        }
    }

    return (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <CalendarClock size={14} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-semibold text-indigo-700">Shift Override</span>
                </div>

                {existing && !editing && !confirmDel && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={openEdit}
                            className="rounded-md p-1 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            aria-label="Edit shift override"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDel(true)}
                            className="rounded-md p-1 text-indigo-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-400"
                            aria-label="Remove shift override"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}

                {!existing && !editing && (
                    <button
                        type="button"
                        onClick={openEdit}
                        className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                        + Set Override
                    </button>
                )}
            </div>

            {/* ── Read view ──────────────────────────────────────────── */}
            {existing && !editing && !confirmDel && (
                <div className="space-y-1 text-xs text-indigo-700">
                    <p>
                        <span className="font-medium">Shift:</span>{' '}
                        {fmtLocalTime(existing.shift_start)} – {fmtLocalTime(existing.shift_end)}
                    </p>
                    {existing.promotes_to_workday && (
                        <p className="font-medium text-emerald-700">Promotes rest day to work day</p>
                    )}
                    {existing.note && (
                        <p className="italic text-indigo-600">"{existing.note}"</p>
                    )}
                </div>
            )}

            {/* ── Delete confirmation ─────────────────────────────────── */}
            {confirmDel && (
                <div className="space-y-2">
                    <p className="text-xs text-rose-700">Remove this shift override?</p>
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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-indigo-700">
                                Shift Start <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={form.shift_start}
                                onChange={(e) => setForm((f) => ({ ...f, shift_start: e.target.value }))}
                                className={[
                                    'w-full rounded-lg border px-3 py-2 text-sm text-slate-800',
                                    'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                    errors.shift_start ? 'border-rose-400 bg-rose-50' : 'border-indigo-200 bg-white',
                                ].join(' ')}
                            />
                            {errors.shift_start && (
                                <p className="mt-1 text-xs text-rose-600">{errors.shift_start}</p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-indigo-700">
                                Shift End <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={form.shift_end}
                                onChange={(e) => setForm((f) => ({ ...f, shift_end: e.target.value }))}
                                className={[
                                    'w-full rounded-lg border px-3 py-2 text-sm text-slate-800',
                                    'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                    errors.shift_end ? 'border-rose-400 bg-rose-50' : 'border-indigo-200 bg-white',
                                ].join(' ')}
                            />
                            {errors.shift_end && (
                                <p className="mt-1 text-xs text-rose-600">{errors.shift_end}</p>
                            )}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={form.promotes_to_workday}
                            onChange={(e) => setForm((f) => ({ ...f, promotes_to_workday: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        <span className="text-xs text-indigo-700">Promote this rest day to a work day</span>
                    </label>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-indigo-700">
                            Note <span className="font-normal text-indigo-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={form.note}
                            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                            maxLength={255}
                            placeholder="e.g. Project deadline – extended shift"
                            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                        />
                        {errors.note && (
                            <p className="mt-1 text-xs text-rose-600">{errors.note}</p>
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
                            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            {saving ? 'Saving…' : existing ? 'Update Override' : 'Set Override'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
