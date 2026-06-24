import React, { useState, useRef } from 'react';
import { Modal, message } from 'antd';
import { Upload, X, FileText, CheckCircle, XCircle, Clock, CalendarDays, Trash2, History } from 'lucide-react';
import { useFileCorrectionMutation, useRemoveCorrectionMutation } from '@/features/timekeeping/attendanceApi';
import { useCancelLeaveApplicationMutation } from '@/features/leave/leaveApi';
import LeaveApplicationModal from './LeaveApplicationModal';
import ShiftOverridePanel from './ShiftOverridePanel';
import TrainingEntryPanel from './TrainingEntryPanel';

/* ── Status config ────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    present:  { label: 'Present',   cls: 'bg-emerald-100 text-emerald-700' },
    late:     { label: 'Late',      cls: 'bg-amber-100 text-amber-700'     },
    absent:   { label: 'Absent',    cls: 'bg-rose-100 text-rose-700'       },
    rest_day: { label: 'Rest Day',  cls: 'bg-slate-100 text-slate-600'     },
};

const CORRECTION_STATUS = {
    pending:  { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700',   icon: Clock       },
    approved: { label: 'Approved',       cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    rejected: { label: 'Rejected',       cls: 'bg-rose-100 text-rose-700',     icon: XCircle     },
};

function fmtTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

// Safely formats time-only strings coming from forms/requests (e.g., "17:00:00")
function fmtLocalTime(timeStr) {
    if (!timeStr) return '—';
    return new Date('1970-01-01T' + timeStr).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function fmtDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString([], {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

function fmtMinutes(mins) {
    if (!mins) return '—';
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

/* ── Removed records history ──────────────────────────────────────────── */
const REMOVED_STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

function RemovedRecordsHistory({ records, label }) {
    const [expanded, setExpanded] = useState(false);
    if (!records?.length) return null;
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-2 text-left focus:outline-none"
                aria-expanded={expanded}
            >
                <History size={11} className="text-slate-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {label} — Removed ({records.length})
                </span>
                <span className="ml-auto text-[10px] text-slate-400">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && records.map((r, i) => (
                <div key={r.id ?? i} className="space-y-1 border-t border-slate-100 pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-500">
                            Was {REMOVED_STATUS_LABEL[r.status] ?? r.status}
                        </span>
                        {r.created_at && (
                            <span className="text-[10px] text-slate-400">
                                · filed {new Date(r.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                        )}
                    </div>
                    {r.reason && (
                        <p className="text-[10px] text-slate-500 line-clamp-2">
                            <span className="font-medium">Reason filed:</span> {r.reason}
                        </p>
                    )}
                    <p className="text-[10px] text-slate-500">
                        <span className="font-medium text-rose-500">Removed</span>
                        {r.deleted_by_name && <> by <strong>{r.deleted_by_name}</strong></>}
                        {r.deleted_at && <> · {new Date(r.deleted_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</>}
                    </p>
                    {r.deleted_reason && (
                        <p className="text-[10px] text-slate-400 italic line-clamp-2">"{r.deleted_reason}"</p>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ── File upload button ───────────────────────────────────────────────── */
function FileUploadArea({ file, onFileChange, error }) {
    const inputRef = useRef(null);

    function handleDrop(e) {
        e.preventDefault();
        const dropped = e.dataTransfer.files[0];
        if (dropped) onFileChange(dropped);
    }

    function handleDragOver(e) { e.preventDefault(); }

    return (
        <div>
            <div
                role="button"
                tabIndex={0}
                aria-label="Upload proof file"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                className={[
                    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors',
                    error ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                ].join(' ')}
            >
                {file ? (
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-indigo-500" />
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                            {file.name}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                            aria-label="Remove file"
                            className="ml-1 text-slate-400 hover:text-rose-500"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Upload size={22} className="mb-1.5 text-slate-400" />
                        <p className="text-xs font-medium text-slate-600">Click or drag to upload proof <span className="font-normal text-slate-400">(optional)</span></p>
                        <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, PDF · max 5 MB</p>
                    </>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files[0] ?? null)}
            />
        </div>
    );
}

/* ── Main modal ───────────────────────────────────────────────────────── */
export default function DayDetailModal({ day, open, onClose, canFile = true, isAdmin = false, isManager = false, targetUserId = null }) {
    const [fileCorrection,  { isLoading: submitting }]  = useFileCorrectionMutation();
    const [removeCorrection, { isLoading: removing }]   = useRemoveCorrectionMutation();
    const [cancelLeave, { isLoading: cancelling }]      = useCancelLeaveApplicationMutation();
    const [leaveModalOpen, setLeaveModalOpen]           = useState(false);

    // Get true local "today" string
    const todayLocal = new Date();
    const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

    const status         = day?.status ?? 'upcoming';
    const isRestDay      = status === 'rest_day';
    const isPastOrToday  = day?.date <= today;
    const canFileCorrection = canFile && !day?.correction && isPastOrToday && status !== 'upcoming';
    const canFileOvertime   = canFile && !day?.overtime   && isPastOrToday && status !== 'upcoming';

    const [formType, setFormType] = useState(() => {
        if (isRestDay || !canFileCorrection) return 'overtime';
        return 'correction';
    });
    const [form, setForm]         = useState({ reason: '', requestedIn: '', requestedOut: '' });
    const [file, setFile]         = useState(null);
    const [errors, setErrors]     = useState({});
    const [success, setSuccess]   = useState(false);

    // Admin remove state
    const [removingType, setRemovingType]   = useState(null); // 'correction' | 'overtime' | null
    const [removeReason, setRemoveReason]   = useState('');
    const [removeError, setRemoveError]     = useState('');

    function resetForm() {
        setForm({ reason: '', requestedIn: '', requestedOut: '' });
        setFile(null);
        setErrors({});
        setSuccess(false);
        setRemovingType(null);
        setRemoveReason('');
        setRemoveError('');
    }

    function handleTypeChange(newType) {
        if (newType === 'correction' && !canFileCorrection) return;
        if (newType === 'overtime'   && !canFileOvertime)   return;
        setFormType(newType);
        setForm((f) => ({ ...f, requestedIn: '', requestedOut: '' }));
        setErrors({});
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    async function handleRemove(correctionId) {
        setRemoveError('');
        if (!removeReason.trim() || removeReason.trim().length < 5) {
            setRemoveError('Please provide at least 5 characters for the reason.');
            return;
        }
        try {
            await removeCorrection({ id: correctionId, deleted_reason: removeReason.trim() }).unwrap();
            message.success('Correction removed. The employee may now re-file.');
            resetForm();
            onClose();
        } catch (err) {
            setRemoveError(err?.data?.message ?? 'Failed to remove correction.');
        }
    }

    async function handleSubmit() {
        setErrors({});
        const isOvernight = !!(form.requestedIn && form.requestedOut && form.requestedOut <= form.requestedIn);

        const fd = new FormData();
        fd.append('date',         day.date);
        fd.append('type',         formType);
        fd.append('reason',       form.reason);
        fd.append('is_overnight', isOvernight ? '1' : '0');
        if (file) fd.append('proof', file);
        if (form.requestedIn)  fd.append('requested_clock_in',  form.requestedIn);
        if (form.requestedOut) fd.append('requested_clock_out', form.requestedOut);

        try {
            await fileCorrection(fd).unwrap();
            setSuccess(true);
            message.success(
                formType === 'overtime'
                    ? 'Overtime request filed successfully.'
                    : 'Correction request filed successfully.'
            );
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            const hasFieldErrors = Object.keys(errs).length > 0;
            setErrors({
                reason:       errs.reason?.[0],
                proof:        errs.proof?.[0],
                requestedIn:  errs.requested_clock_in?.[0],
                requestedOut: errs.requested_clock_out?.[0],
                general:      !hasFieldErrors ? (err?.data?.message ?? 'Something went wrong.') : null,
            });
            message.error(err?.data?.message ?? 'Unable to file request. Please check your input.');
        }
    }

    if (!day) return null;

    const statusCfg  = STATUS_CONFIG[status];
    const correction = day.correction;
    const overtime   = day.overtime;
    const leave      = day.leave;
    const correctionApproved = correction?.status === 'approved';
    const corrCfg    = correction ? CORRECTION_STATUS[correction.status] : null;
    const otCfg      = overtime   ? CORRECTION_STATUS[overtime.status]   : null;
    const CorrIcon   = corrCfg?.icon ?? null;
    const OtIcon     = otCfg?.icon   ?? null;

    // Leave helpers
    const LEAVE_STATUS = {
        pending:  { label: 'Pending Review', cls: 'bg-violet-50 text-violet-700 border-violet-200',   icon: Clock       },
        approved: { label: 'Approved',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
        rejected: { label: 'Rejected',       cls: 'bg-rose-50 text-rose-700 border-rose-200',         icon: XCircle     },
    };
    const leaveCfg   = leave ? LEAVE_STATUS[leave.status] : null;
    const LeaveIcon  = leaveCfg?.icon ?? null;

    const canFilLeave = canFile && !leave && !isRestDay && day?.date >= today;
    const canFileAny = canFileCorrection || canFileOvertime;

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            title={fmtDate(day.date)}
            width={480}
            destroyOnHidden
        >
            <div className="space-y-4 pt-1">
                {/* Status + times row — skip for rest days */}
                {!isRestDay && (
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="space-y-1.5">
                            {statusCfg && (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
                                    {statusCfg.label}
                                </span>
                            )}
                            <div className="flex gap-4 text-xs text-slate-500">
                                <span>In: <strong className="text-slate-700">{fmtTime(day.clock_in)}</strong></span>
                                <span>Out: <strong className="text-slate-700">{fmtTime(day.clock_out)}</strong></span>
                            </div>
                            {(day.lunch_start || day.lunch_start_time) && (
                                <div className="flex gap-4 text-xs text-slate-500">
                                    <span>Lunch: <strong className="text-slate-700">
                                        {fmtTime(day.lunch_start)}
                                        {' – '}
                                        {day.lunch_end ? fmtTime(day.lunch_end) : '—'}
                                    </strong></span>
                                </div>
                            )}
                            {day.breaks?.filter((b) => b.start).map((b, i) => (
                                <div key={i} className="flex gap-4 text-xs text-slate-500">
                                    <span>Break {i + 1}: <strong className="text-slate-700">
                                        {fmtTime(b.start)}
                                        {b.end ? ` – ${fmtTime(b.end)}` : ' (ongoing)'}
                                    </strong></span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {day.total_worked_minutes != null && (
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700 tabular-nums">
                                    {fmtMinutes(day.total_worked_minutes)}
                                </span>
                            )}
                            {!correctionApproved && day.status === 'late' && (day.late_minutes ?? 0) > 0 && (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-600 tabular-nums">
                                    +{fmtMinutes(day.late_minutes)} Late
                                </span>
                            )}
                            {!correctionApproved && day.undertime_minutes > 0 && (
                                <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-600 tabular-nums">
                                    -{fmtMinutes(day.undertime_minutes)} UT
                                </span>
                            )}
                            {!correctionApproved && (day.over_break_minutes ?? 0) > 0 && (
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-600 tabular-nums">
                                    +{fmtMinutes(day.over_break_minutes)} OB
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Existing correction status card */}
                {correction && corrCfg && (
                    <div className="space-y-2">
                        <div className={`flex items-start gap-3 rounded-xl border p-4 ${corrCfg.cls} border-current/20`}>
                            <CorrIcon size={16} className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold">Correction — {corrCfg.label}</p>
                                <p className="mt-0.5 text-xs leading-relaxed opacity-90 line-clamp-3">
                                    {correction.reason}
                                </p>
                                {(correction.requested_clock_in || correction.requested_clock_out) && (
                                    <p className="mt-0.5 text-xs opacity-80">
                                        Requested:{' '}
                                        {correction.requested_clock_in ? fmtLocalTime(correction.requested_clock_in) : '—'}
                                        {' – '}
                                        {correction.requested_clock_out ? fmtLocalTime(correction.requested_clock_out) : '—'}
                                    </p>
                                )}
                                {correction.admin_note && (
                                    <p className="mt-1.5 text-xs opacity-75">
                                        <strong>Admin note:</strong> {correction.admin_note}
                                    </p>
                                )}
                                {(correction.effective_shift_start && correction.effective_shift_end) && (
                                    <p className="mt-1 text-xs opacity-75">
                                        <strong>Effective shift:</strong>{' '}
                                        {correction.effective_shift_start} – {correction.effective_shift_end}
                                    </p>
                                )}
                                {correction.created_at && (
                                    <p className="mt-1.5 text-[10px] opacity-60">
                                        Filed {new Date(correction.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                )}
                            </div>
                            {/* Admin remove trigger */}
                            {isAdmin && removingType !== 'correction' && (
                                <button
                                    type="button"
                                    onClick={() => { setRemovingType('correction'); setRemoveReason(''); setRemoveError(''); }}
                                    aria-label="Remove correction"
                                    title="Remove so employee can re-file"
                                    className="shrink-0 rounded-md p-1 text-current opacity-50 hover:opacity-100 hover:text-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {/* Inline remove form — admin only */}
                        {isAdmin && removingType === 'correction' && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                                <p className="text-xs font-semibold text-rose-700">Remove this correction?</p>
                                <p className="text-xs text-rose-600 opacity-80">
                                    The record will be archived and the employee will be able to file again.
                                </p>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-rose-700">
                                        Reason for removal <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={removeReason}
                                        onChange={(e) => setRemoveReason(e.target.value)}
                                        placeholder="e.g. Filed on wrong date, employee re-submitting…"
                                        className={[
                                            'w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400',
                                            'focus:outline-none focus:ring-2 focus:ring-rose-400 transition-colors',
                                            removeError ? 'border-rose-400 bg-white' : 'border-rose-200 bg-white',
                                        ].join(' ')}
                                    />
                                    {removeError && <p className="mt-1 text-xs text-rose-600">{removeError}</p>}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setRemovingType(null); setRemoveReason(''); setRemoveError(''); }}
                                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(correction.id)}
                                        disabled={removing}
                                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                                    >
                                        {removing ? 'Removing…' : 'Confirm Remove'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Time-log history — shown when correction was approved and history exists */}
                        {correction.status === 'approved' && correction.history?.length > 0 && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Time Log Changes
                                </p>
                                {correction.history.map((h, i) => (
                                    <div key={i} className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Clock In</span>
                                            <span className="tabular-nums text-rose-500 line-through">{fmtTime(h.old_clock_in)}</span>
                                            <span className="text-slate-400">→</span>
                                            <span className="tabular-nums font-semibold text-emerald-600">{fmtTime(h.new_clock_in)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Clock Out</span>
                                            <span className="tabular-nums text-rose-500 line-through">{fmtTime(h.old_clock_out)}</span>
                                            <span className="text-slate-400">→</span>
                                            <span className="tabular-nums font-semibold text-emerald-600">{fmtTime(h.new_clock_out)}</span>
                                        </div>
                                        {h.changed_by && (
                                            <span className="ml-auto text-[10px] text-slate-400">
                                                by <strong className="text-slate-500">{h.changed_by}</strong>
                                                {h.changed_at && <> · {new Date(h.changed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</>}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <RemovedRecordsHistory records={day.removed_corrections} label="Correction" />
                    </div>
                )}
                {/* Standalone removed-correction history when no active correction exists */}
                {!correction && day?.removed_corrections?.length > 0 && (
                    <RemovedRecordsHistory records={day.removed_corrections} label="Correction" />
                )}

                {/* Existing overtime status card */}
                {overtime && otCfg && (
                    <div className="space-y-2">
                        <div className={`flex items-start gap-3 rounded-xl border p-4 ${otCfg.cls} border-current/20`}>
                            <OtIcon size={16} className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold">Overtime — {otCfg.label}</p>
                                <p className="mt-0.5 text-xs leading-relaxed opacity-90 line-clamp-3">
                                    {overtime.reason}
                                </p>
                                {overtime.requested_clock_in && overtime.requested_clock_out && (
                                    <p className="mt-0.5 text-xs opacity-80">
                                        {fmtLocalTime(overtime.requested_clock_in)} – {fmtLocalTime(overtime.requested_clock_out)}
                                    </p>
                                )}
                                {overtime.admin_note && (
                                    <p className="mt-1.5 text-xs opacity-75">
                                        <strong>Admin note:</strong> {overtime.admin_note}
                                    </p>
                                )}
                                {overtime.created_at && (
                                    <p className="mt-1.5 text-[10px] opacity-60">
                                        Filed {new Date(overtime.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                )}
                            </div>
                            {/* Admin remove trigger */}
                            {isAdmin && removingType !== 'overtime' && (
                                <button
                                    type="button"
                                    onClick={() => { setRemovingType('overtime'); setRemoveReason(''); setRemoveError(''); }}
                                    aria-label="Remove overtime request"
                                    title="Remove so employee can re-file"
                                    className="shrink-0 rounded-md p-1 text-current opacity-50 hover:opacity-100 hover:text-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {/* Inline remove form — admin only */}
                        {isAdmin && removingType === 'overtime' && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                                <p className="text-xs font-semibold text-rose-700">Remove this overtime request?</p>
                                <p className="text-xs text-rose-600 opacity-80">
                                    The record will be archived and the employee will be able to file again.
                                </p>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-rose-700">
                                        Reason for removal <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={removeReason}
                                        onChange={(e) => setRemoveReason(e.target.value)}
                                        placeholder="e.g. Incorrect hours, employee will re-file…"
                                        className={[
                                            'w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400',
                                            'focus:outline-none focus:ring-2 focus:ring-rose-400 transition-colors',
                                            removeError ? 'border-rose-400 bg-white' : 'border-rose-200 bg-white',
                                        ].join(' ')}
                                    />
                                    {removeError && <p className="mt-1 text-xs text-rose-600">{removeError}</p>}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setRemovingType(null); setRemoveReason(''); setRemoveError(''); }}
                                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(overtime.id)}
                                        disabled={removing}
                                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                                    >
                                        {removing ? 'Removing…' : 'Confirm Remove'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <RemovedRecordsHistory records={day.removed_overtime} label="Overtime" />
                    </div>
                )}
                {/* Standalone removed-overtime history when no active overtime exists */}
                {!overtime && day?.removed_overtime?.length > 0 && (
                    <RemovedRecordsHistory records={day.removed_overtime} label="Overtime" />
                )}

                {/* ── Leave Application section ─────────────────────────────── */}
                {leave && leaveCfg && LeaveIcon && (
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${leaveCfg.cls}`}>
                        <LeaveIcon size={16} className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold">
                                {leave.leave_type?.name ?? 'Leave'} — {leaveCfg.label}
                            </p>
                            <p className="mt-0.5 text-xs opacity-80">
                                {new Date(leave.start_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                {leave.start_date !== leave.end_date && (
                                    <> – {new Date(leave.end_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                )}
                                {' · '}{leave.half_day ? `Half Day (${leave.half_day_period})` : `${leave.days_requested} day(s)`}
                            </p>
                            {leave.reason && (
                                <p className="mt-0.5 text-xs opacity-75 line-clamp-2">{leave.reason}</p>
                            )}
                            {/* Cancel button — only for pending */}
                            {leave.status === 'pending' && canFile && (
                                <button
                                    type="button"
                                    disabled={cancelling}
                                    onClick={async () => {
                                        try {
                                            await cancelLeave(leave.id).unwrap();
                                            message.success('Leave application cancelled.');
                                            handleClose();
                                        } catch {
                                            message.error('Failed to cancel leave application.');
                                        }
                                    }}
                                    className="mt-2 rounded-md border border-current/30 px-3 py-1 text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    {cancelling ? 'Cancelling...' : 'Cancel Leave'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Apply for Leave button — shown when no leave exists for this day */}
                {canFilLeave && !leave && (
                    <div className="border-t border-slate-100 pt-3">
                        <button
                            type="button"
                            onClick={() => setLeaveModalOpen(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                            <CalendarDays size={16} />
                            Apply for Leave
                        </button>
                    </div>
                )}

                {/* Leave Application sub-modal */}
                <LeaveApplicationModal
                    open={leaveModalOpen}
                    initialDate={day.date}
                    onClose={() => {
                        setLeaveModalOpen(false);
                        handleClose();
                    }}
                />

                {/* ── Manager panels: Shift Override + Training ────────── */}
                {isManager && day.date >= today && (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                        <ShiftOverridePanel
                            day={day}
                            targetUserId={targetUserId}
                            onClose={handleClose}
                        />
                        <TrainingEntryPanel
                            day={day}
                            targetUserId={targetUserId}
                            onClose={handleClose}
                        />
                    </div>
                )}

                {/* Success message after filing */}
                {success && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <p className="text-xs font-medium text-emerald-700">
                            {formType === 'overtime'
                                ? 'Overtime request filed successfully. It is pending review.'
                                : 'Correction filed successfully. It is pending review.'}
                        </p>
                    </div>
                )}

                {/* File form — show when canFile for selected type, or switch to other type after success */}
                {canFileAny && !success && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                        {/* Type toggle — disabled for already-filed types */}
                        {!isRestDay && (
                            <div className="flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Request type">
                                {[{ value: 'correction', label: 'Correction' }, { value: 'overtime', label: 'Overtime' }].map(({ value, label }) => {
                                    const alreadyFiled = value === 'correction' ? !!correction : !!overtime;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleTypeChange(value)}
                                            disabled={alreadyFiled}
                                            aria-pressed={formType === value}
                                            title={alreadyFiled ? `${label} already filed` : undefined}
                                            className={[
                                                'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400',
                                                alreadyFiled
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : formType === value
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700',
                                            ].join(' ')}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-semibold text-slate-800">
                                {formType === 'overtime' ? 'File Overtime Request' : 'File a Correction'}
                            </h3>
                            {formType === 'overtime' && (
                                <p className="mt-0.5 text-xs text-slate-400">Report extra hours worked. Start and end times are required.</p>
                            )}
                        </div>

                        {errors.general && (
                            <p className="text-xs text-rose-600">{errors.general}</p>
                        )}

                        {/* Reason */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                Reason <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={form.reason}
                                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                                placeholder="Briefly explain what happened (min. 10 characters)…"
                                className={[
                                    'w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400',
                                    'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                    errors.reason ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white',
                                ].join(' ')}
                            />
                            {errors.reason && <p className="mt-1 text-xs text-rose-600">{errors.reason}</p>}
                        </div>

                        {/* Requested / Overtime times */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                    {formType === 'overtime' ? <>Overtime Start <span className="text-rose-500">*</span></> : 'Requested Clock In'}
                                </label>
                                <input
                                    type="time"
                                    value={form.requestedIn}
                                    onChange={(e) => setForm((f) => ({ ...f, requestedIn: e.target.value }))}
                                    className={[
                                        'w-full rounded-lg border px-3 py-2 text-sm text-slate-800',
                                        'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                        errors.requestedIn ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white',
                                    ].join(' ')}
                                />
                                {errors.requestedIn && <p className="mt-1 text-xs text-rose-600">{errors.requestedIn}</p>}
                            </div>
                            <div>
                                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                    {formType === 'overtime' ? <>Overtime End <span className="text-rose-500">*</span></> : 'Requested Clock Out'}
                                    {form.requestedIn && form.requestedOut && form.requestedOut <= form.requestedIn && (
                                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                            next day
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="time"
                                    value={form.requestedOut}
                                    onChange={(e) => setForm((f) => ({ ...f, requestedOut: e.target.value }))}
                                    className={[
                                        'w-full rounded-lg border px-3 py-2 text-sm text-slate-800',
                                        'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors',
                                        errors.requestedOut ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white',
                                    ].join(' ')}
                                />
                                {errors.requestedOut && <p className="mt-1 text-xs text-rose-600">{errors.requestedOut}</p>}
                            </div>
                        </div>

                        {/* Proof upload */}
                        <FileUploadArea
                            file={file}
                            onFileChange={setFile}
                            error={errors.proof}
                        />

                        {/* Submit */}
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                {submitting
                                    ? 'Submitting…'
                                    : formType === 'overtime' ? 'Submit Overtime' : 'Submit Correction'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}