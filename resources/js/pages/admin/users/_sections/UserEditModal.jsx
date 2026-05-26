import React, { useEffect, useState } from 'react';
import { Modal, Tabs, Spin, Switch, Skeleton } from 'antd';
import {
    User, Shield, CalendarClock, Tag, Gift, Building2, AtSign,
    PlusCircle, Trash2, CheckCircle2, ShieldCheck, Timer, Wallet, History, Plus,
    Pencil, X,
} from 'lucide-react';
import { useUpdateUserMutation } from '@/features/users/usersApi';
import { useGetRolesQuery } from '@/features/roles/rolesApi';
import { useUpsertScheduleMutation } from '@/features/timekeeping/scheduleApi';
import {
    useGetUserDeductionsQuery,
    useGetDeductionTypesQuery,
    useCreateUserDeductionMutation,
    useDeleteUserDeductionMutation,
    useGetUserAllowancesQuery,
    useGetAllowanceTypesQuery,
    useCreateUserAllowanceMutation,
    useDeleteUserAllowanceMutation,
    useGetUserGovDeductionsQuery,
    useUpdateUserGovDeductionMutation,
} from '@/features/payroll/payrollApi';
import {
    useGetDepartmentsQuery,
    useGetAccountsQuery,
} from '@/features/organization/organizationApi';
import {
    useGetBreakConfigQuery,
    useUpsertBreakConfigMutation,
} from '@/features/timekeeping/breakConfigApi';
import {
    useGetUserLeaveCreditsQuery,
    useUpsertLeaveCreditMutation,
    useGetLeaveTypesQuery,
    useCreateLeaveTypeMutation,
    useUpdateLeaveTypeMutation,
    useAssignLeaveTypeMutation,
    useRemoveLeaveAssignmentMutation,
} from '@/features/leave/leaveApi';

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
const ROLE_COLORS = {
    super_admin: 'text-purple-700',
    admin:       'text-red-600',
    manager:     'text-orange-600',
    team_lead:   'text-blue-600',
    employee:    'text-slate-600',
};

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

const DEFAULT_SCHED = { work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], shift_start: '08:00', shift_end: '17:00' };
const DEFAULT_DED   = { deduction_type_id: '', amount: '', effective_from: '', effective_until: '', description: '' };
const DEFAULT_ALL   = { allowance_type_id: '', amount: '', effective_from: '', effective_to: '', description: '' };

function fmtCurrency(val) {
    if (val == null) return '—';
    return '₱' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

/* ─── Leave Credits Tab ─────────────────────────────────────────────────── */
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - 1 + i);

function fmtTxDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila',
    });
}

/* ─── Leave Type Form modal (create + edit) ──────────────────────────────── */
const DEFAULT_COLORS = ['#6d28d9', '#059669', '#dc2626', '#d97706', '#0284c7', '#db2777'];

function LeaveTypeFormModal({ open, onClose, editingType = null }) {
    const isEdit = !!editingType;

    const BLANK = {
        name: '', code: '', color: DEFAULT_COLORS[0],
        min_advance_days: 0, max_consecutive_days: '', requires_proof_above_days: '',
        is_paid: true, is_active: true, is_monetizable: false,
        policy_type: '', monthly_rate: '', annual_amount: '',
    };

    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [createLeaveType, { isLoading: creating }] = useCreateLeaveTypeMutation();
    const [updateLeaveType, { isLoading: updating }] = useUpdateLeaveTypeMutation();
    const isLoading = creating || updating;

    useEffect(() => {
        if (open) {
            if (isEdit) {
                const p = editingType.policy;
                setForm({
                    name:                      editingType.name ?? '',
                    code:                      editingType.code ?? '',
                    color:                     editingType.color ?? DEFAULT_COLORS[0],
                    min_advance_days:          editingType.min_advance_days ?? 0,
                    max_consecutive_days:      editingType.max_consecutive_days ?? '',
                    requires_proof_above_days: editingType.requires_proof_above_days ?? '',
                    is_paid:                   editingType.is_paid ?? true,
                    is_active:                 editingType.is_active ?? true,
                    is_monetizable:            editingType.is_monetizable ?? false,
                    policy_type:               p?.allocation_type ?? '',
                    monthly_rate:              p?.monthly_rate ?? '',
                    annual_amount:             p?.annual_amount ?? '',
                });
            } else {
                setForm(BLANK);
            }
            setErrors({});
        }
    }, [open, editingType?.id]);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined, general: undefined }));
    }

    async function handleSubmit() {
        setErrors({});
        const payload = {
            name:                      form.name,
            code:                      form.code.toUpperCase(),
            color:                     form.color,
            min_advance_days:          Number(form.min_advance_days) || 0,
            max_consecutive_days:      form.max_consecutive_days !== '' ? Number(form.max_consecutive_days) : null,
            requires_proof_above_days: form.requires_proof_above_days !== '' ? Number(form.requires_proof_above_days) : null,
            is_paid:                   form.is_paid,
            is_active:                 form.is_active,
            is_monetizable:            form.is_monetizable,
        };
        if (form.policy_type) {
            payload.policy = {
                allocation_type: form.policy_type,
                monthly_rate:    form.policy_type === 'monthly_accrual' ? Number(form.monthly_rate) : null,
                annual_amount:   form.policy_type === 'annual_lump'     ? Number(form.annual_amount) : null,
                is_active:       true,
            };
        }
        try {
            if (isEdit) {
                await updateLeaveType({ id: editingType.id, ...payload }).unwrap();
            } else {
                await createLeaveType(payload).unwrap();
            }
            onClose();
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setErrors({
                name:    errs.name?.[0],
                code:    errs.code?.[0],
                color:   errs.color?.[0],
                general: Object.keys(errs).length === 0 ? (err?.data?.message ?? 'Something went wrong.') : null,
            });
        }
    }

    return (
        <Modal open={open} onCancel={onClose} title={isEdit ? 'Edit Leave Type' : 'New Leave Type'} footer={null} width={440} destroyOnClose>
            <div className="space-y-3 py-2">
                {errors.general && <p className="text-xs text-rose-600">{errors.general}</p>}

                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-rose-500">*</span></label>
                        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Vacation Leave"
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.name ? 'border-rose-300' : 'border-slate-200'}`} />
                        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Code <span className="text-rose-500">*</span></label>
                        <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="VL" maxLength={10}
                            className={`w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.code ? 'border-rose-300' : 'border-slate-200'}`} />
                        {errors.code && <p className="mt-1 text-xs text-rose-600">{errors.code}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                    <div className="flex items-center gap-2">
                        {DEFAULT_COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => set('color', c)}
                                style={{ backgroundColor: c }}
                                className={`h-6 w-6 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                                aria-label={c} />
                        ))}
                        <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
                            className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0.5" title="Custom color" />
                    </div>
                    {errors.color && <p className="mt-1 text-xs text-rose-600">{errors.color}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Min Advance Days</label>
                        <input type="number" min="0" value={form.min_advance_days} onChange={(e) => set('min_advance_days', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Max Consecutive</label>
                        <input type="number" min="1" value={form.max_consecutive_days} onChange={(e) => set('max_consecutive_days', e.target.value)} placeholder="∞"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Proof Above (days)</label>
                        <input type="number" min="1" value={form.requires_proof_above_days} onChange={(e) => set('requires_proof_above_days', e.target.value)} placeholder="—"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                        <input type="checkbox" checked={form.is_paid} onChange={(e) => set('is_paid', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
                        Paid Leave
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
                        Active
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                        <input type="checkbox" checked={form.is_monetizable} onChange={(e) => set('is_monetizable', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
                        Monetizable
                    </label>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Credit Policy</label>
                    <select value={form.policy_type} onChange={(e) => set('policy_type', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400">
                        <option value="">None</option>
                        <option value="monthly_accrual">Monthly Accrual</option>
                        <option value="annual_lump">Annual Lump Sum</option>
                        <option value="manual">Manual</option>
                    </select>
                </div>
                {form.policy_type === 'monthly_accrual' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Rate (days)</label>
                        <input type="number" min="0" step="0.1" value={form.monthly_rate} onChange={(e) => set('monthly_rate', e.target.value)} placeholder="e.g. 0.5"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                )}
                {form.policy_type === 'annual_lump' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Annual Amount (days)</label>
                        <input type="number" min="0" step="0.5" value={form.annual_amount} onChange={(e) => set('annual_amount', e.target.value)} placeholder="e.g. 6"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
                        {isLoading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Type')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function LeaveCreditsTab({ user }) {
    const [year, setYear]             = useState(CURRENT_YEAR);
    const [assignTypeId, setAssignTypeId] = useState('');
    const [assignError, setAssignError]   = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [adjustForm, setAdjustForm] = useState({ action: 'add', amount: '', note: '' });
    const [adjustErrors, setAdjustErrors] = useState({});
    const [typeFormOpen, setTypeFormOpen] = useState(false);
    const [editingType, setEditingType]   = useState(null);

    const { data, isLoading } = useGetUserLeaveCreditsQuery(
        { userId: user?.id, year },
        { skip: !user?.id },
    );
    const { data: typesData } = useGetLeaveTypesQuery();
    const [upsert,  { isLoading: saving }]    = useUpsertLeaveCreditMutation();
    const [assign,  { isLoading: assigning }] = useAssignLeaveTypeMutation();
    const [remove,  { isLoading: removing }]  = useRemoveLeaveAssignmentMutation();

    const credits      = data?.data         ?? [];
    const transactions = data?.transactions ?? [];
    const leaveTypes   = typesData?.data    ?? [];

    // Separate assigned vs unassigned active types for the assign dropdown
    const assignedTypeIds  = new Set(credits.map((c) => String(c.leave_type?.id)));
    const unassignedTypes  = leaveTypes.filter((t) => t.is_active && !assignedTypeIds.has(String(t.id)));

    function openEditType(typeId) {
        const found = leaveTypes.find((t) => String(t.id) === String(typeId));
        if (found) { setEditingType(found); setTypeFormOpen(true); }
    }

    async function handleAssign() {
        setAssignError('');
        if (!assignTypeId) { setAssignError('Select a leave type to assign.'); return; }
        try {
            await assign({ userId: user.id, leave_type_id: assignTypeId, year }).unwrap();
            setAssignTypeId('');
        } catch (err) {
            setAssignError(err?.data?.message ?? 'Failed to assign leave type.');
        }
    }

    async function handleRemove(credit) {
        try {
            await remove({ userId: user.id, leaveTypeId: credit.leave_type?.id, year }).unwrap();
            if (expandedId === credit.id) setExpandedId(null);
        } catch {}
    }

    function toggleExpand(credit) {
        if (expandedId === credit.id) {
            setExpandedId(null);
        } else {
            setExpandedId(credit.id);
            setAdjustForm({ action: 'add', amount: '', note: '' });
            setAdjustErrors({});
        }
    }

    async function handleAdjust(credit) {
        setAdjustErrors({});
        if (!adjustForm.amount || isNaN(adjustForm.amount) || Number(adjustForm.amount) <= 0) {
            setAdjustErrors({ amount: 'Must be a positive number' }); return;
        }
        try {
            await upsert({
                userId: user.id,
                leave_type_id: credit.leave_type?.id,
                year,
                action: adjustForm.action,
                amount: Number(adjustForm.amount),
                note:   adjustForm.note,
            }).unwrap();
            setExpandedId(null);
            setAdjustForm({ action: 'add', amount: '', note: '' });
        } catch (err) {
            const errs = err?.data?.errors ?? {};
            setAdjustErrors({
                amount:  errs.amount?.[0],
                general: Object.keys(errs).length === 0 ? (err?.data?.message ?? 'Something went wrong.') : null,
            });
        }
    }

    return (
        <div className="space-y-4 py-2">
            {/* Year selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Year:</span>
                <div className="flex gap-1">
                    {YEAR_OPTIONS.map((y) => (
                        <button key={y} type="button" onClick={() => setYear(y)}
                            className={['rounded-lg border px-3 py-1 text-xs font-semibold transition-colors', year === y ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'].join(' ')}>
                            {y}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Assign section ── */}
            <div className="rounded-xl border border-slate-200 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assign Leave Type</p>
                {assignError && <p className="text-xs text-rose-600">{assignError}</p>}
                <div className="flex gap-2">
                    <select
                        value={assignTypeId}
                        onChange={(e) => { setAssignTypeId(e.target.value); setAssignError(''); }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                        <option value="">Select leave type...</option>
                        {unassignedTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    {/* Edit selected unassigned type */}
                    {assignTypeId && (
                        <button type="button" onClick={() => openEditType(assignTypeId)}
                            title="Edit this leave type"
                            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400">
                            <Pencil size={14} />
                        </button>
                    )}

                    {/* Create new leave type */}
                    <button type="button" onClick={() => { setEditingType(null); setTypeFormOpen(true); }}
                        title="Create new leave type"
                        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400">
                        <Plus size={15} />
                    </button>

                    <button type="button" onClick={handleAssign} disabled={!assignTypeId || assigning}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                        {assigning ? '...' : 'Assign'}
                    </button>
                </div>
            </div>

            {/* ── Assigned types list ── */}
            {isLoading ? (
                <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} active paragraph={{ rows: 1 }} />)}</div>
            ) : credits.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-3">No leave types assigned for {year}.</p>
            ) : (
                <div className="space-y-2">
                    {credits.map((credit) => {
                        const balance = parseFloat(credit.balance ?? 0);
                        const used    = parseFloat(credit.used_credits ?? 0);
                        const total   = parseFloat(credit.total_credits ?? 0) + parseFloat(credit.carried_over ?? 0);
                        const pct     = total > 0 ? Math.max(0, Math.min(100, (balance / total) * 100)) : 0;
                        const color   = credit.leave_type?.color ?? '#6d28d9';
                        const isExpanded = expandedId === credit.id;

                        return (
                            <div key={credit.id} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                                {/* Balance row */}
                                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                <span className="text-sm font-semibold text-slate-700">{credit.leave_type?.name ?? '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs tabular-nums text-slate-500">
                                                <span>Used: <strong className="text-rose-600">{used}</strong></span>
                                                <span>Balance: <strong className={balance > 0 ? 'text-emerald-600' : 'text-slate-400'}>{balance}</strong></span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button type="button" onClick={() => toggleExpand(credit)}
                                            title="Adjust credits"
                                            className={['flex h-7 w-7 items-center justify-center rounded-lg border transition-colors focus:outline-none', isExpanded ? 'border-violet-300 bg-violet-100 text-violet-600' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600'].join(' ')}>
                                            <Pencil size={12} />
                                        </button>
                                        <button type="button" onClick={() => handleRemove(credit)} disabled={removing}
                                            title="Remove assignment"
                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 transition-colors focus:outline-none disabled:opacity-50">
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Inline adjust panel */}
                                {isExpanded && (
                                    <div className="border-t border-slate-200 bg-white px-4 py-3 space-y-2">
                                        {adjustErrors.general && <p className="text-xs text-rose-600">{adjustErrors.general}</p>}
                                        <div className="flex gap-2">
                                            <div className="flex rounded-lg border border-slate-200 p-0.5 shrink-0">
                                                {['add', 'set'].map((v) => (
                                                    <button key={v} type="button" onClick={() => setAdjustForm((f) => ({ ...f, action: v }))}
                                                        className={['rounded-md px-3 py-1 text-xs font-semibold transition-colors', adjustForm.action === v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'].join(' ')}>
                                                        {v.charAt(0).toUpperCase() + v.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex-1">
                                                <input type="number" min="0" step="0.5"
                                                    value={adjustForm.amount}
                                                    onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))}
                                                    placeholder="Amount (days)"
                                                    className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 ${adjustErrors.amount ? 'border-rose-300' : 'border-slate-200'}`} />
                                                {adjustErrors.amount && <p className="mt-0.5 text-xs text-rose-600">{adjustErrors.amount}</p>}
                                            </div>
                                        </div>
                                        <input type="text"
                                            value={adjustForm.note}
                                            onChange={(e) => setAdjustForm((f) => ({ ...f, note: e.target.value }))}
                                            placeholder="Reason (optional)" maxLength={255}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setExpandedId(null)}
                                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                                                Cancel
                                            </button>
                                            <button type="button" onClick={() => handleAdjust(credit)} disabled={saving}
                                                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
                                                {saving ? 'Saving...' : 'Apply'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Transaction history ── */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <History size={14} className="text-slate-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Transactions</p>
                </div>
                {transactions.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-3">No transactions yet.</p>
                ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${tx.type === 'credit' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span className="font-medium text-slate-700">{tx.leave_type?.name ?? '—'}</span>
                                    {tx.note && <span className="text-slate-400 truncate max-w-[140px]" title={tx.note}>{tx.note}</span>}
                                </div>
                                <div className="flex items-center gap-3 tabular-nums shrink-0">
                                    <span className={`font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'credit' ? '+' : '-'}{tx.amount}</span>
                                    <span className="text-slate-400">{fmtTxDate(tx.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <LeaveTypeFormModal
                open={typeFormOpen}
                editingType={editingType}
                onClose={() => { setTypeFormOpen(false); setEditingType(null); }}
            />
        </div>
    );
}

function SavedBadge() {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={13} /> Saved
        </span>
    );
}

function TabSection({ title, children }) {
    return (
        <div className="space-y-4 pt-1">
            {title && <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>}
            {children}
        </div>
    );
}

function Field({ label, required, error, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="mt-1">{children}</div>
            {error && <p className="mt-1 text-xs text-rose-600">{error[0]}</p>}
        </div>
    );
}

function inputCls(err) {
    return `block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        err ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
    }`;
}

/* ─── Profile Tab ────────────────────────────────────────────────────────── */
function ProfileTab({ user }) {
    const [form, setForm]   = useState({ first_name: '', middle_name: '', last_name: '', email: '', password: '', monthly_salary: '', department_id: null, account_id: null });
    const [errors, setErrors] = useState({});
    const [saved, setSaved]   = useState(false);

    const [updateUser, { isLoading }] = useUpdateUserMutation();
    const { data: deptData }  = useGetDepartmentsQuery({ active_only: 1 });
    const { data: acctData }  = useGetAccountsQuery({ active_only: 1 });

    const departments = deptData?.data ?? [];
    const accounts    = acctData?.data ?? [];

    useEffect(() => {
        setForm({
            first_name:     user?.first_name     ?? '',
            middle_name:    user?.middle_name    ?? '',
            last_name:      user?.last_name      ?? '',
            email:          user?.email          ?? '',
            password:       '',
            monthly_salary: user?.monthly_salary ?? '',
            department_id:  user?.department_id  ?? null,
            account_id:     user?.account_id     ?? null,
        });
        setErrors({});
        setSaved(false);
    }, [user?.id]);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setErrors({});
        setSaved(false);
        try {
            const payload = {
                id:            user.id,
                first_name:    form.first_name,
                last_name:     form.last_name,
                email:         form.email,
                department_id: form.department_id ?? null,
                account_id:    form.account_id    ?? null,
            };
            if (form.middle_name !== '') payload.middle_name = form.middle_name || null;
            if (form.password)           payload.password = form.password;
            if (form.monthly_salary !== '') payload.monthly_salary = parseFloat(form.monthly_salary);
            await updateUser(payload).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" required error={errors.first_name}>
                    <input type="text" value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                        className={inputCls(errors.first_name)} placeholder="Jane" disabled={isLoading} />
                </Field>
                <Field label="Last Name" required error={errors.last_name}>
                    <input type="text" value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                        className={inputCls(errors.last_name)} placeholder="Doe" disabled={isLoading} />
                </Field>
            </div>

            <Field
                label={<>Middle Name <span className="font-normal text-slate-400">(optional)</span></>}
                error={errors.middle_name}
            >
                <input type="text" value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)}
                    className={inputCls(errors.middle_name)} placeholder="Marie" disabled={isLoading} />
            </Field>

            <Field label="Email" required error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    className={inputCls(errors.email)} placeholder="jane@example.com" disabled={isLoading} />
            </Field>

            <Field
                label={<>Password <span className="font-normal text-slate-400">(leave blank to keep current)</span></>}
                error={errors.password}
            >
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                    className={inputCls(errors.password)} placeholder="••••••••" disabled={isLoading} />
            </Field>

            <Field label="Monthly Salary (₱)" error={errors.monthly_salary}>
                <input type="number" min="0" step="0.01" value={form.monthly_salary}
                    onChange={(e) => set('monthly_salary', e.target.value)}
                    className={inputCls(errors.monthly_salary)} placeholder="e.g. 25000" disabled={isLoading} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Department" error={errors.department_id}>
                    <select
                        value={form.department_id ?? ''}
                        onChange={(e) => set('department_id', e.target.value ? parseInt(e.target.value) : null)}
                        className={inputCls(errors.department_id)}
                        disabled={isLoading}
                    >
                        <option value="">— None —</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Account" error={errors.account_id}>
                    <select
                        value={form.account_id ?? ''}
                        onChange={(e) => set('account_id', e.target.value ? parseInt(e.target.value) : null)}
                        className={inputCls(errors.account_id)}
                        disabled={isLoading}
                    >
                        <option value="">— None —</option>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                {saved && <SavedBadge />}
                <button type="submit" disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60">
                    {isLoading && <Spin size="small" />}
                    Save Profile
                </button>
            </div>
        </form>
    );
}

/* ─── Roles Tab ──────────────────────────────────────────────────────────── */
function RolesTab({ user }) {
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [errors, setErrors]               = useState({});
    const [saved, setSaved]                 = useState(false);

    const { data: rolesData } = useGetRolesQuery();
    const [updateUser, { isLoading }] = useUpdateUserMutation();

    const roles = rolesData?.data ?? rolesData ?? [];

    useEffect(() => {
        setSelectedRoles(user?.roles?.map((r) => r.id) ?? []);
        setErrors({});
        setSaved(false);
    }, [user?.id]);

    function toggle(roleId) {
        setSelectedRoles((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
    }

    async function handleSave(e) {
        e.preventDefault();
        setErrors({});
        setSaved(false);
        try {
            await updateUser({ id: user.id, roles: selectedRoles }).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-4 pt-1">
            <p className="text-xs text-slate-400">Roles are stackable — a user can hold multiple.</p>

            <div className="space-y-2">
                {roles.map((role) => (
                    <label key={role.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => toggle(role.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            disabled={isLoading} />
                        <div>
                            <span className={`text-sm font-medium ${ROLE_COLORS[role.slug] ?? 'text-slate-700'}`}>{role.name}</span>
                            {role.description && <p className="text-xs text-slate-400">{role.description}</p>}
                        </div>
                    </label>
                ))}
            </div>
            {errors.roles && <p className="text-xs text-rose-600">{errors.roles[0]}</p>}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                {saved && <SavedBadge />}
                <button type="submit" disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60">
                    {isLoading && <Spin size="small" />}
                    Save Roles
                </button>
            </div>
        </form>
    );
}

/* ─── Schedule Tab ───────────────────────────────────────────────────────── */
function ScheduleTab({ user }) {
    const [form, setForm]     = useState(DEFAULT_SCHED);
    const [errors, setErrors] = useState({});
    const [saved, setSaved]   = useState(false);

    const [upsertSchedule, { isLoading }] = useUpsertScheduleMutation();

    useEffect(() => {
        const s = user?.schedule;
        if (s) {
            setForm({
                work_days:   s.work_days   ?? DEFAULT_SCHED.work_days,
                shift_start: s.shift_start ?? DEFAULT_SCHED.shift_start,
                shift_end:   s.shift_end   ?? DEFAULT_SCHED.shift_end,
            });
        } else {
            setForm(DEFAULT_SCHED);
        }
        setErrors({});
        setSaved(false);
    }, [user?.id]);

    function toggleDay(day) {
        setErrors((e) => ({ ...e, work_days: undefined }));
        setForm((f) => {
            const has = f.work_days.includes(day);
            return { ...f, work_days: has ? f.work_days.filter((d) => d !== day) : [...f.work_days, day] };
        });
    }

    function setField(field, value) {
        setErrors((e) => ({ ...e, [field]: undefined }));
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setErrors({});
        setSaved(false);
        try {
            await upsertSchedule({ userId: user.id, work_days: form.work_days, shift_start: form.shift_start, shift_end: form.shift_end }).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-5 pt-1">
            {/* Work Days */}
            <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Work Days</label>
                <div className="flex flex-wrap gap-2">
                    {ALL_DAYS.map((day) => {
                        const selected = form.work_days.includes(day);
                        return (
                            <button key={day} type="button" onClick={() => toggleDay(day)}
                                aria-pressed={selected}
                                className={[
                                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500',
                                    selected ? DAY_COLORS[day] : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600',
                                ].join(' ')}>
                                {day}
                            </button>
                        );
                    })}
                </div>
                {errors.work_days && <p className="mt-1 text-xs text-red-500">{errors.work_days[0]}</p>}
                {form.work_days.length === 0 && !errors.work_days && (
                    <p className="mt-1 text-xs text-amber-500">Select at least one day.</p>
                )}
            </div>

            {/* Shift Hours */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Shift Start</label>
                    <input type="time" value={form.shift_start} onChange={(e) => setField('shift_start', e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.shift_start ? 'border-red-400' : 'border-slate-300'}`} />
                    {errors.shift_start && <p className="mt-1 text-xs text-red-500">{errors.shift_start[0]}</p>}
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Shift End</label>
                    <input type="time" value={form.shift_end} onChange={(e) => setField('shift_end', e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.shift_end ? 'border-red-400' : 'border-slate-300'}`} />
                    {errors.shift_end && <p className="mt-1 text-xs text-red-500">{errors.shift_end[0]}</p>}
                </div>
            </div>

            {/* Preview */}
            {form.work_days.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Preview</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">
                        {form.work_days.join(', ')} &nbsp;·&nbsp; {form.shift_start} → {form.shift_end}
                    </p>
                </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                {saved && <SavedBadge />}
                <button type="submit" disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60">
                    {isLoading && <Spin size="small" />}
                    Save Schedule
                </button>
            </div>
        </form>
    );
}

/* ─── Deductions Tab ─────────────────────────────────────────────────────── */
function DeductionsTab({ user }) {
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm]         = useState(DEFAULT_DED);
    const [errors, setErrors]     = useState({});

    const { data, isLoading }  = useGetUserDeductionsQuery(user?.id, { skip: !user });
    const { data: typesData }  = useGetDeductionTypesQuery();
    const [create, { isLoading: creating }] = useCreateUserDeductionMutation();
    const [remove]                          = useDeleteUserDeductionMutation();

    const deductions      = data?.data ?? [];
    const deductionTypes  = typesData?.data ?? typesData ?? [];
    const assignableTypes = deductionTypes.filter((t) => t.is_assignable && t.is_active);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    async function handleAdd(e) {
        e.preventDefault();
        setErrors({});
        try {
            await create({
                userId:            user.id,
                deduction_type_id: Number(form.deduction_type_id),
                amount:            parseFloat(form.amount),
                effective_from:    form.effective_from,
                effective_until:   form.effective_until || null,
                description:       form.description || null,
            }).unwrap();
            setForm(DEFAULT_DED);
            setFormOpen(false);
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    function confirmDelete(d) {
        Modal.confirm({
            title: 'Remove Deduction',
            content: `Remove "${d.deduction_type?.name}" from ${user?.name}?`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk: () => remove({ userId: user.id, deductionId: d.id }),
        });
    }

    if (isLoading) return <div className="flex justify-center py-10"><Spin /></div>;

    return (
        <div className="space-y-4 pt-1">
            {!formOpen && (
                <button onClick={() => setFormOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <PlusCircle size={15} /> Add Deduction
                </button>
            )}

            {formOpen && (
                <form onSubmit={handleAdd} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">New Deduction</p>

                    <div>
                        <label className="block text-xs font-medium text-slate-600">Type</label>
                        <select value={form.deduction_type_id} onChange={(e) => set('deduction_type_id', e.target.value)}
                            className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.deduction_type_id ? 'border-rose-400' : 'border-slate-200 bg-white'}`}
                            disabled={creating}>
                            <option value="">Select type…</option>
                            {assignableTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        {errors.deduction_type_id && <p className="mt-0.5 text-xs text-rose-600">{errors.deduction_type_id[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600">Amount (₱)</label>
                        <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
                            className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.amount ? 'border-rose-400' : 'border-slate-200 bg-white'}`}
                            placeholder="0.00" disabled={creating} />
                        {errors.amount && <p className="mt-0.5 text-xs text-rose-600">{errors.amount[0]}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Effective From</label>
                            <input type="date" value={form.effective_from} onChange={(e) => set('effective_from', e.target.value)}
                                className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.effective_from ? 'border-rose-400' : 'border-slate-200 bg-white'}`}
                                disabled={creating} />
                            {errors.effective_from && <p className="mt-0.5 text-xs text-rose-600">{errors.effective_from[0]}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Until <span className="text-slate-400">(opt.)</span></label>
                            <input type="date" value={form.effective_until} onChange={(e) => set('effective_until', e.target.value)}
                                className="mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={creating} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600">Description <span className="text-slate-400">(opt.)</span></label>
                        <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)}
                            className="mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Salary loan – April 2026" disabled={creating} />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setFormOpen(false); setForm(DEFAULT_DED); setErrors({}); }}
                            disabled={creating}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={creating}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60">
                            {creating && <Spin size="small" />} Add
                        </button>
                    </div>
                </form>
            )}

            {deductions.length === 0 && !formOpen && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Tag size={28} className="text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No recurring deductions</p>
                    <p className="text-xs text-slate-400">Add a loan or recurring deduction above.</p>
                </div>
            )}

            <div className="space-y-2">
                {deductions.map((d) => (
                    <div key={d.id} className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">{d.deduction_type?.name}</p>
                            <p className="text-xs text-slate-400">{d.effective_from} → {d.effective_until ?? 'Ongoing'}</p>
                            {d.description && <p className="mt-0.5 text-xs text-slate-500 italic">{d.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-rose-600">{fmtCurrency(d.amount)}</span>
                            <button onClick={() => confirmDelete(d)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Allowances Tab ─────────────────────────────────────────────────────── */
function AllowancesTab({ user }) {
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm]         = useState(DEFAULT_ALL);
    const [errors, setErrors]     = useState({});

    const { data, isLoading }  = useGetUserAllowancesQuery(user?.id, { skip: !user });
    const { data: typesData }  = useGetAllowanceTypesQuery();
    const [create, { isLoading: creating }] = useCreateUserAllowanceMutation();
    const [remove]                          = useDeleteUserAllowanceMutation();

    const allowances     = data?.data ?? data ?? [];
    const allowanceTypes = typesData?.data ?? typesData ?? [];

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    const selectedType = allowanceTypes.find((t) => String(t.id) === String(form.allowance_type_id));

    async function handleAdd(e) {
        e.preventDefault();
        setErrors({});
        try {
            await create({
                userId:            user.id,
                allowance_type_id: Number(form.allowance_type_id),
                amount:            parseFloat(form.amount),
                effective_from:    form.effective_from,
                effective_to:      form.effective_to || null,
                description:       form.description || null,
            }).unwrap();
            setForm(DEFAULT_ALL);
            setFormOpen(false);
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    function confirmDelete(a) {
        Modal.confirm({
            title: 'Remove Allowance',
            content: `Remove "${a.allowance_type?.name}" from ${user?.name}?`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk: () => remove({ userId: user.id, allowanceId: a.id }),
        });
    }

    if (isLoading) return <div className="flex justify-center py-10"><Spin /></div>;

    return (
        <div className="space-y-4 pt-1">
            {!formOpen && (
                <button onClick={() => setFormOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <PlusCircle size={15} /> Add Allowance
                </button>
            )}

            {formOpen && (
                <form onSubmit={handleAdd} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">New Allowance</p>

                    <div>
                        <label className="block text-xs font-medium text-slate-600">Allowance Type</label>
                        <select value={form.allowance_type_id} onChange={(e) => set('allowance_type_id', e.target.value)}
                            className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.allowance_type_id ? 'border-rose-400' : 'border-slate-200 bg-white'}`}
                            disabled={creating}>
                            <option value="">Select type…</option>
                            {allowanceTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}{!t.is_taxable ? ' (De Minimis)' : ''}</option>
                            ))}
                        </select>
                        {errors.allowance_type_id && <p className="mt-0.5 text-xs text-rose-600">{errors.allowance_type_id[0]}</p>}
                        {selectedType && !selectedType.is_taxable && selectedType.monthly_de_minimis_limit && (
                            <p className="mt-1 rounded-lg bg-sky-50 border border-sky-100 px-2.5 py-1.5 text-xs text-sky-700">
                                BIR de minimis — non-taxable up to <strong>{fmtCurrency(selectedType.monthly_de_minimis_limit)}/month</strong>.
                            </p>
                        )}
                        {selectedType?.is_taxable && (
                            <p className="mt-1 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5 text-xs text-amber-700">
                                Taxable allowance — included in WHT base.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600">Monthly Amount (₱)</label>
                        <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
                            className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.amount ? 'border-rose-400' : 'border-slate-200 bg-white'}`}
                            placeholder="0.00" disabled={creating} />
                        <p className="mt-0.5 text-[10px] text-slate-400">Full monthly amount — system halves it per cutoff.</p>
                        {errors.amount && <p className="mt-0.5 text-xs text-rose-600">{errors.amount[0]}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Effective From</label>
                            <input type="date" value={form.effective_from} onChange={(e) => set('effective_from', e.target.value)}
                                className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.effective_from ? 'border-rose-400' : 'border-slate-200 bg-white'}`}
                                disabled={creating} />
                            {errors.effective_from && <p className="mt-0.5 text-xs text-rose-600">{errors.effective_from[0]}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">End Date <span className="text-slate-400">(opt.)</span></label>
                            <input type="date" value={form.effective_to} onChange={(e) => set('effective_to', e.target.value)}
                                className="mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                disabled={creating} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600">Description <span className="text-slate-400">(opt.)</span></label>
                        <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)}
                            className="mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="e.g. Fixed monthly rice subsidy" disabled={creating} />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setFormOpen(false); setForm(DEFAULT_ALL); setErrors({}); }}
                            disabled={creating}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={creating}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60">
                            {creating && <Spin size="small" />} Add
                        </button>
                    </div>
                </form>
            )}

            {allowances.length === 0 && !formOpen && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Gift size={28} className="text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No recurring allowances</p>
                    <p className="text-xs text-slate-400">Add rice subsidy, meal, transportation, and other allowances above.</p>
                </div>
            )}

            <div className="space-y-2">
                {allowances.map((a) => (
                    <div key={a.id} className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-slate-700">{a.allowance_type?.name}</p>
                                {a.allowance_type && !a.allowance_type.is_taxable && (
                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-600">De Minimis</span>
                                )}
                                {a.allowance_type?.is_taxable && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Taxable</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{a.effective_from} → {a.effective_to ?? 'Ongoing'}</p>
                            {a.description && <p className="mt-0.5 text-xs text-slate-500 italic">{a.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <p className="font-semibold text-sm text-emerald-600">{fmtCurrency(a.amount)}</p>
                                <p className="text-[10px] text-slate-400">/month</p>
                            </div>
                            <button onClick={() => confirmDelete(a)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Gov Contributions Tab ──────────────────────────────────────────────── */
function GovContributionsTab({ user }) {
    const { data, isLoading } = useGetUserGovDeductionsQuery(user?.id, { skip: !user?.id });
    const [updateToggle] = useUpdateUserGovDeductionMutation();

    const items = data?.data ?? [];

    const handleToggle = (code, checked) => {
        updateToggle({ userId: user.id, code, is_enabled: checked });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Spin />
            </div>
        );
    }

    return (
        <TabSection title="Government Contributions">
            <p className="text-xs text-slate-500 mb-4">
                Toggle each contribution to include or waive it from this employee's payslips.
                Changes take effect on the next generated payslip.
            </p>
            <div className="space-y-3">
                {items.map((item) => (
                    <div key={item.code} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 bg-white">
                        <div>
                            <p className="text-sm font-medium text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{item.code}</p>
                            {!item.is_enabled && (
                                <p className="text-xs text-amber-600 mt-1">
                                    Waived — will be excluded from payslips until re-enabled
                                </p>
                            )}
                        </div>
                        <Switch
                            checked={item.is_enabled}
                            onChange={(checked) => handleToggle(item.code, checked)}
                        />
                    </div>
                ))}
            </div>
        </TabSection>
    );
}

/* ─── Breaks Tab ────────────────────────────────────────────────────────── */
function BreaksTab({ user }) {
    const [form, setForm]     = useState({ break_allowed: false, break_count: 2, break_duration_minutes: 15, lunch_duration_minutes: 60 });
    const [errors, setErrors] = useState({});
    const [saved, setSaved]   = useState(false);

    const { data: configData, isLoading } = useGetBreakConfigQuery(user?.id, { skip: !user?.id });
    const [upsert, { isLoading: saving }] = useUpsertBreakConfigMutation();

    useEffect(() => {
        const cfg = configData?.data ?? configData;
        if (cfg && cfg.break_allowed !== undefined) {
            setForm({
                break_allowed:          cfg.break_allowed ?? false,
                break_count:            cfg.break_count ?? 2,
                break_duration_minutes: cfg.break_duration_minutes ?? 15,
                lunch_duration_minutes: cfg.lunch_duration_minutes ?? 60,
            });
        } else {
            setForm({ break_allowed: false, break_count: 2, break_duration_minutes: 15, lunch_duration_minutes: 60 });
        }
        setErrors({});
        setSaved(false);
    }, [user?.id, configData]);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setErrors({});
        setSaved(false);
        try {
            await upsert({
                userId:                 user.id,
                break_allowed:          form.break_allowed,
                break_count:            Number(form.break_count),
                break_duration_minutes: Number(form.break_duration_minutes),
                lunch_duration_minutes: Number(form.lunch_duration_minutes),
            }).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    if (isLoading) return <div className="flex justify-center py-10"><Spin /></div>;

    return (
        <form onSubmit={handleSave} className="space-y-5 pt-1">
            {/* Master toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-slate-50">
                <div>
                    <p className="text-sm font-medium text-slate-700">Allow Breaks</p>
                    <p className="text-xs text-slate-400 mt-0.5">Enable daily break entitlement for this employee</p>
                </div>
                <Switch checked={form.break_allowed} onChange={(v) => set('break_allowed', v)} />
            </div>

            {/* Settings — only visible when breaks are enabled */}
            {form.break_allowed && (
                <div className="space-y-4">
                    <Field label="Number of Breaks per Day" error={errors.break_count}>
                        <div className="flex gap-2">
                            {[1, 2].map((n) => (
                                <button key={n} type="button"
                                    onClick={() => set('break_count', n)}
                                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                                        form.break_count === n
                                            ? 'border-sky-400 bg-sky-50 text-sky-700'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                    }`}>
                                    {n} break{n > 1 ? 's' : ''}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field label="Break Duration (minutes)" error={errors.break_duration_minutes}>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="5" max="60" step="5"
                                value={form.break_duration_minutes}
                                onChange={(e) => set('break_duration_minutes', Number(e.target.value))}
                                className="flex-1 accent-sky-600"
                            />
                            <span className="w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm font-semibold text-slate-700">
                                {form.break_duration_minutes}m
                            </span>
                        </div>
                    </Field>

                    {/* Preview */}
                    <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-500">Preview</p>
                        <p className="mt-1 text-sm font-semibold text-sky-800">
                            {form.break_count} × {form.break_duration_minutes} min break{form.break_count > 1 ? 's' : ''} per day
                        </p>
                        <p className="text-xs text-sky-600 mt-0.5">
                            = {form.break_count * form.break_duration_minutes} min total break time deducted from worked hours
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                {saved && <SavedBadge />}
                <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors disabled:opacity-60">
                    {saving && <Spin size="small" />}
                    Save Breaks
                </button>
            </div>
        </form>
    );
}

/* ─── Coming Soon placeholder ────────────────────────────────────────────── */
function ComingSoon({ icon: Icon, label }) {
    return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Icon size={32} className="text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">{label}</p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Coming Soon</span>
        </div>
    );
}

/* ─── UserEditModal ──────────────────────────────────────────────────────── */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-amber-500',  'bg-sky-500',     'bg-rose-500',
];

export default function UserEditModal({ open, onClose, user }) {
    const colorClass = AVATAR_COLORS[(user?.id ?? 0) % AVATAR_COLORS.length];

    const TABS = [
        {
            key:      'profile',
            label:    <span className="flex items-center gap-1.5"><User size={13} /> Profile</span>,
            children: <ProfileTab user={user} />,
        },
        {
            key:      'roles',
            label:    <span className="flex items-center gap-1.5"><Shield size={13} /> Roles</span>,
            children: <RolesTab user={user} />,
        },
        {
            key:      'schedule',
            label:    <span className="flex items-center gap-1.5"><CalendarClock size={13} /> Schedule</span>,
            children: <ScheduleTab user={user} />,
        },
        {
            key:      'deductions',
            label:    <span className="flex items-center gap-1.5"><Tag size={13} /> Deductions</span>,
            children: <DeductionsTab user={user} />,
        },
        {
            key:      'allowances',
            label:    <span className="flex items-center gap-1.5"><Gift size={13} /> Allowances</span>,
            children: <AllowancesTab user={user} />,
        },
        {
            key:      'gov-contributions',
            label:    <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Gov. Contributions</span>,
            children: <GovContributionsTab user={user} />,
        },
        {
            key:      'breaks',
            label:    <span className="flex items-center gap-1.5"><Timer size={13} /> Breaks</span>,
            children: <BreaksTab user={user} />,
        },
        {
            key:      'leave-credits',
            label:    <span className="flex items-center gap-1.5"><Wallet size={13} /> Leave Credits</span>,
            children: <LeaveCreditsTab user={user} />,
        },
        {
            key:      'account',
            label:    <span className="flex items-center gap-1.5 text-slate-400"><AtSign size={13} /> Account</span>,
            disabled: true,
            children: <ComingSoon icon={AtSign} label="Account settings" />,
        },
        {
            key:      'department',
            label:    <span className="flex items-center gap-1.5 text-slate-400"><Building2 size={13} /> Department</span>,
            disabled: true,
            children: <ComingSoon icon={Building2} label="Department assignment" />,
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={760}
            destroyOnHidden
            title={
                user ? (
                    <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colorClass}`}>
                            {getInitials(user.name)}
                        </span>
                        <div>
                            <p className="text-base font-semibold text-slate-800 leading-tight">{user.name}</p>
                            <p className="text-xs text-slate-400 font-normal">{user.email}</p>
                        </div>
                    </div>
                ) : null
            }
        >
            <Tabs
                defaultActiveKey="profile"
                items={TABS}
                className="mt-2"
            />
        </Modal>
    );
}
