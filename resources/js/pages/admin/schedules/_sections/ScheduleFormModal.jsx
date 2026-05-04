import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { useUpsertScheduleMutation } from '@/features/timekeeping/scheduleApi';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_COLORS = {
    Mon: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    Tue: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    Wed: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    Thu: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    Fri: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    Sat: 'bg-amber-100 text-amber-700 border-amber-300',
    Sun: 'bg-rose-100 text-rose-700 border-rose-300',
};

const DEFAULT_FORM = { work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], shift_start: '08:00', shift_end: '17:00' };

export default function ScheduleFormModal({ open, onClose, targetUser }) {
    const [form, setForm]     = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});

    const [upsertSchedule, { isLoading }] = useUpsertScheduleMutation();

    /* Pre-fill from existing schedule when opening */
    useEffect(() => {
        if (!open) return;
        const s = targetUser?.schedule;
        if (s && s.id) {
            setForm({
                work_days:   s.work_days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                shift_start: s.shift_start ?? '08:00',
                shift_end:   s.shift_end   ?? '17:00',
            });
        } else {
            setForm(DEFAULT_FORM);
        }
        setErrors({});
    }, [open, targetUser]);

    function toggleDay(day) {
        setErrors((prev) => ({ ...prev, work_days: undefined }));
        setForm((prev) => {
            const has = prev.work_days.includes(day);
            return {
                ...prev,
                work_days: has
                    ? prev.work_days.filter((d) => d !== day)
                    : [...prev.work_days, day],
            };
        });
    }

    function setField(field, value) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit() {
        setErrors({});
        try {
            await upsertSchedule({
                userId:      targetUser.id,
                work_days:   form.work_days,
                shift_start: form.shift_start,
                shift_end:   form.shift_end,
            }).unwrap();
            onClose();
        } catch (err) {
            if (err?.status === 422) {
                setErrors(err.data?.errors ?? {});
            }
        }
    }

    const title = targetUser
        ? `${targetUser.schedule?.id ? 'Edit' : 'Assign'} Schedule — ${targetUser.name}`
        : 'Schedule';

    return (
        <Modal
            open={open}
            title={<span className="font-semibold text-slate-800">{title}</span>}
            onCancel={onClose}
            onOk={handleSubmit}
            okText={targetUser?.schedule?.id ? 'Save Changes' : 'Assign Schedule'}
            okButtonProps={{ loading: isLoading, className: 'bg-indigo-600 hover:bg-indigo-700' }}
            cancelButtonProps={{ disabled: isLoading }}
            destroyOnClose
            width={480}
        >
            <div className="space-y-5 py-2">
                {/* Work Days */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Work Days
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map((day) => {
                            const selected = form.work_days.includes(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={[
                                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500',
                                        selected
                                            ? DAY_COLORS[day]
                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600',
                                    ].join(' ')}
                                    aria-pressed={selected}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    {errors.work_days && (
                        <p className="mt-1 text-xs text-red-500">{errors.work_days[0]}</p>
                    )}
                    {form.work_days.length === 0 && !errors.work_days && (
                        <p className="mt-1 text-xs text-amber-500">Select at least one day.</p>
                    )}
                </div>

                {/* Shift Hours */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Shift Start
                        </label>
                        <input
                            type="time"
                            value={form.shift_start}
                            onChange={(e) => setField('shift_start', e.target.value)}
                            className={[
                                'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                                errors.shift_start ? 'border-red-400' : 'border-slate-300',
                            ].join(' ')}
                        />
                        {errors.shift_start && (
                            <p className="mt-1 text-xs text-red-500">{errors.shift_start[0]}</p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Shift End
                        </label>
                        <input
                            type="time"
                            value={form.shift_end}
                            onChange={(e) => setField('shift_end', e.target.value)}
                            className={[
                                'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
                                errors.shift_end ? 'border-red-400' : 'border-slate-300',
                            ].join(' ')}
                        />
                        {errors.shift_end && (
                            <p className="mt-1 text-xs text-red-500">{errors.shift_end[0]}</p>
                        )}
                    </div>
                </div>

                {/* Summary preview */}
                {form.work_days.length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs text-slate-500">Preview</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                            {form.work_days.join(', ')} &nbsp;·&nbsp; {form.shift_start} → {form.shift_end}
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
