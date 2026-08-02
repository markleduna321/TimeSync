import React, { useState } from 'react';
import { CalendarCheck2, CalendarX2 } from 'lucide-react';
import { message } from 'antd';
import { useUpsertScheduleOverrideMutation } from '@/features/timekeeping/attendanceApi';

export default function RestDayOverridePanel({ day, targetUserId, onClose }) {
    const existing = day?.shift_override ?? null;
    const [upsertOverride, { isLoading: saving }] = useUpsertScheduleOverrideMutation();

    const [mode, setMode] = useState(() => {
        if (existing?.demotes_to_restday) return 'rest';
        if (existing?.promotes_to_workday) return 'work';
        return day?.status === 'rest_day' ? 'work' : 'rest';
    });
    const [swapDate, setSwapDate] = useState(existing?.swap_date ?? '');
    const [note, setNote] = useState(existing?.note ?? '');
    const [error, setError] = useState('');

    async function handleSave() {
        setError('');

        const trimmedNote = note.trim();
        if (!trimmedNote) {
            setError('Please provide a reason for this change.');
            return;
        }

        if (mode === 'work' && !swapDate) {
            setError('Please select the rest day to swap with.');
            return;
        }

        try {
            await upsertOverride({
                userId: targetUserId,
                user_id: targetUserId,
                date: day.date,
                shift_start: existing?.shift_start ?? null,
                shift_end: existing?.shift_end ?? null,
                promotes_to_workday: mode === 'work',
                demotes_to_restday: mode === 'rest',
                swap_date: swapDate,
                note: trimmedNote,
            }).unwrap();

            message.success(mode === 'rest' ? 'Day marked as rest day.' : 'Day marked as work day.');
            onClose();
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setError(errs.note?.[0] ?? err?.data?.message ?? 'Unable to save day status change.');
        }
    }

    const statusLabel = day?.status === 'rest_day' ? 'Currently Rest Day' : 'Currently Work Day';

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    {mode === 'rest' ? (
                        <CalendarX2 size={14} className="text-amber-600 shrink-0" />
                    ) : (
                        <CalendarCheck2 size={14} className="text-emerald-600 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-amber-700">Day Status Override</span>
                </div>
                <span className="text-[11px] font-medium text-amber-700">{statusLabel}</span>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setMode('rest')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mode === 'rest'
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-100'
                    }`}
                >
                    Mark as Rest Day
                </button>
                <button
                    type="button"
                    onClick={() => setMode('work')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mode === 'work'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100'
                    }`}
                >
                    Mark as Work Day
                </button>
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-amber-700">
                    Swap with{' '}
                    {mode === 'work'
                        ? <span className="text-rose-500">*</span>
                        : <span className="text-amber-500 font-normal">(optional)</span>}
                </label>
                <input
                    type="date"
                    value={swapDate}
                    onChange={(e) => setSwapDate(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
                />
                <p className="mt-1 text-[11px] text-amber-700">
                    {mode === 'rest' && !swapDate
                        ? 'Leave blank to grant a standalone rest day with no compensatory swap.'
                        : mode === 'rest'
                        ? 'The selected day will be converted to a work day.'
                        : 'Select the rest day to exchange with this work day.'}
                </p>
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-amber-700">
                    Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain the change for audit purposes"
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
                />
                {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60 transition-colors"
                >
                    {saving ? 'Saving…' : 'Save Change'}
                </button>
            </div>
        </div>
    );
}
