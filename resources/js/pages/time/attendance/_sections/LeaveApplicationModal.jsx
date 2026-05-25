import React, { useState, useMemo, useRef } from 'react';
import { Modal, message } from 'antd';
import { CalendarDays, Upload, X, FileText, Info, AlertTriangle } from 'lucide-react';
import { useGetLeaveTypesQuery, useFileLeaveApplicationMutation, useGetMyLeaveCreditsQuery } from '@/features/leave/leaveApi';

const UI_LOCALE   = 'en-PH';
const UI_TIMEZONE = 'Asia/Manila';

const today = new Date().toISOString().slice(0, 10);

function fmtDateLabel(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(UI_LOCALE, {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: UI_TIMEZONE,
    });
}

function addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/* ── File upload sub-component ────────────────────────────────────────── */
function FileUploadArea({ file, onFileChange, error, label = 'Upload proof (required)' }) {
    const inputRef = useRef(null);

    function handleDrop(e) {
        e.preventDefault();
        const dropped = e.dataTransfer.files[0];
        if (dropped) onFileChange(dropped);
    }

    return (
        <div>
            <div
                role="button" tabIndex={0} aria-label="Upload leave proof"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                className={[
                    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors',
                    error ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                ].join(' ')}
            >
                {file ? (
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-indigo-500" />
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                            className="text-slate-400 hover:text-rose-500">
                            <X size={13} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Upload size={18} className="mb-1 text-slate-400" />
                        <p className="text-xs font-medium text-slate-600">{label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, PDF · max 5 MB</p>
                    </>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={(e) => onFileChange(e.target.files[0] ?? null)} />
        </div>
    );
}

/* ── Main Modal ───────────────────────────────────────────────────────── */
export default function LeaveApplicationModal({ open, onClose, initialDate = null }) {
    const { data: typesData }   = useGetLeaveTypesQuery();
    const { data: creditsData } = useGetMyLeaveCreditsQuery();
    const [fileLeave, { isLoading: submitting }] = useFileLeaveApplicationMutation();

    const leaveTypes = typesData?.data ?? [];
    const allCredits = creditsData?.data ?? [];

    const [form, setForm] = useState({
        leave_type_id: '',
        start_date:    initialDate ?? today,
        end_date:      initialDate ?? today,
        half_day:      false,
        half_day_period: 'AM',
        reason:        '',
    });
    const [proofFile, setProofFile] = useState(null);
    const [errors, setErrors]       = useState({});

    // Reset when modal opens/closes
    function handleClose() {
        setForm({
            leave_type_id: '',
            start_date: initialDate ?? today,
            end_date:   initialDate ?? today,
            half_day: false,
            half_day_period: 'AM',
            reason: '',
        });
        setProofFile(null);
        setErrors({});
        onClose();
    }

    const selectedType = leaveTypes.find((t) => String(t.id) === String(form.leave_type_id));
    const creditRecord = allCredits.find((c) => String(c.leave_type?.id) === String(form.leave_type_id));
    const balance      = creditRecord ? parseFloat(creditRecord.balance) : null;

    // Compute working days estimate (simple: calendar days, weekends excluded)
    const estimatedDays = useMemo(() => {
        if (!form.start_date || !form.end_date) return 0;
        if (form.half_day) return 0.5;

        let count = 0;
        const s   = new Date(form.start_date + 'T00:00:00');
        const e   = new Date(form.end_date + 'T00:00:00');
        const cur = new Date(s);
        while (cur <= e) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    }, [form.start_date, form.end_date, form.half_day]);

    // Advance notice warning
    const advanceNoticeWarning = useMemo(() => {
        if (!selectedType || selectedType.min_advance_days === 0) return null;
        const earliest = addDays(today, selectedType.min_advance_days);
        if (form.start_date < earliest) {
            return `${selectedType.name} requires at least ${selectedType.min_advance_days} day(s) advance notice. Earliest allowed: ${fmtDateLabel(earliest)}.`;
        }
        return null;
    }, [selectedType, form.start_date]);

    const requiresProof = selectedType?.requires_proof_above_days != null
        && estimatedDays > selectedType.requires_proof_above_days;

    const insufficientCredits = balance !== null && estimatedDays > balance;

    function set(field, value) {
        setForm((f) => {
            const next = { ...f, [field]: value };
            // Auto-adjust end_date if it falls before start_date
            if (field === 'start_date' && next.end_date < value) {
                next.end_date = value;
            }
            // Half-day: force same start/end
            if (field === 'half_day' && value) {
                next.end_date = next.start_date;
            }
            return next;
        });
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    async function handleSubmit() {
        setErrors({});

        const fd = new FormData();
        fd.append('leave_type_id',   form.leave_type_id);
        fd.append('start_date',      form.start_date);
        fd.append('end_date',        form.end_date);
        fd.append('half_day',        form.half_day ? '1' : '0');
        if (form.half_day) fd.append('half_day_period', form.half_day_period);
        if (form.reason)   fd.append('reason', form.reason);
        if (proofFile)     fd.append('proof', proofFile);

        try {
            await fileLeave(fd).unwrap();
            message.success('Leave application filed successfully.');
            handleClose();
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setErrors({
                leave_type_id: errs.leave_type_id?.[0],
                start_date:    errs.start_date?.[0],
                end_date:      errs.end_date?.[0],
                proof:         errs.proof?.[0],
                general:       Object.keys(errs).length === 0 ? (err?.data?.message ?? 'Something went wrong.') : null,
            });
        }
    }

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-violet-600" />
                    <span className="font-semibold text-slate-800">Apply for Leave</span>
                </div>
            }
            footer={null}
            width={480}
            destroyOnClose
        >
            <div className="space-y-4 py-2">

                {/* General error */}
                {errors.general && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700">
                        {errors.general}
                    </div>
                )}

                {/* Leave Type */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        Leave Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                        value={form.leave_type_id}
                        onChange={(e) => set('leave_type_id', e.target.value)}
                        className={[
                            'w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400',
                            errors.leave_type_id ? 'border-rose-300 bg-rose-50' : 'border-slate-200',
                        ].join(' ')}
                    >
                        <option value="">Select leave type...</option>
                        {leaveTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {errors.leave_type_id && <p className="mt-1 text-xs text-rose-600">{errors.leave_type_id}</p>}
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Start Date <span className="text-rose-500">*</span></label>
                        <input
                            type="date" value={form.start_date}
                            onChange={(e) => set('start_date', e.target.value)}
                            className={[
                                'w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400',
                                errors.start_date ? 'border-rose-300' : 'border-slate-200',
                            ].join(' ')}
                        />
                        {errors.start_date && <p className="mt-1 text-xs text-rose-600">{errors.start_date}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">End Date <span className="text-rose-500">*</span></label>
                        <input
                            type="date" value={form.end_date}
                            min={form.start_date}
                            disabled={form.half_day}
                            onChange={(e) => set('end_date', e.target.value)}
                            className={[
                                'w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60',
                                errors.end_date ? 'border-rose-300' : 'border-slate-200',
                            ].join(' ')}
                        />
                        {errors.end_date && <p className="mt-1 text-xs text-rose-600">{errors.end_date}</p>}
                    </div>
                </div>

                {/* Half Day toggle */}
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={form.half_day}
                            onChange={(e) => set('half_day', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                        />
                        <span className="text-sm text-slate-700">Half Day</span>
                    </label>
                    {form.half_day && (
                        <div className="flex gap-2">
                            {['AM', 'PM'].map((p) => (
                                <button
                                    key={p} type="button"
                                    onClick={() => set('half_day_period', p)}
                                    className={[
                                        'rounded-lg border px-3 py-1 text-xs font-semibold transition-colors',
                                        form.half_day_period === p
                                            ? 'bg-violet-600 border-violet-600 text-white'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-100',
                                    ].join(' ')}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Duration + balance summary */}
                {form.leave_type_id && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Info size={14} className="text-slate-400" />
                            <span>Duration: <strong>{estimatedDays} working day{estimatedDays !== 1 ? 's' : ''}</strong></span>
                        </div>
                        {balance !== null && (
                            <span className={`font-semibold ${insufficientCredits ? 'text-rose-600' : 'text-emerald-600'}`}>
                                Balance: {balance} day{balance !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}

                {/* Insufficient credits warning */}
                {insufficientCredits && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 flex items-start gap-2 text-sm text-rose-700">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                        <span>Insufficient credits. You need {estimatedDays} day(s) but only have {balance}.</span>
                    </div>
                )}

                {/* Advance notice warning */}
                {advanceNoticeWarning && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2 text-sm text-amber-700">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                        <span>{advanceNoticeWarning}</span>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                    <textarea
                        rows={3}
                        value={form.reason}
                        onChange={(e) => set('reason', e.target.value)}
                        placeholder="Brief description of reason for leave..."
                        maxLength={1000}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                </div>

                {/* Proof upload — shown when leave type requires it */}
                {(requiresProof || proofFile) && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Supporting Document {requiresProof && <span className="text-rose-500">*</span>}
                        </label>
                        <FileUploadArea
                            file={proofFile}
                            onFileChange={setProofFile}
                            error={errors.proof}
                            label={requiresProof
                                ? `Required for ${selectedType?.name} over ${selectedType?.requires_proof_above_days} day(s)`
                                : 'Attach supporting document (optional)'}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                    <button
                        type="button" onClick={handleClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        Cancel
                    </button>
                    <button
                        type="button" onClick={handleSubmit}
                        disabled={submitting || !form.leave_type_id || insufficientCredits}
                        className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                        {submitting ? 'Submitting...' : 'Submit Leave'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
