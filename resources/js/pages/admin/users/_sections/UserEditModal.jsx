import React, { useEffect, useState } from 'react';
import { Modal, Tabs, Spin, Switch } from 'antd';
import {
    User, Shield, CalendarClock, Tag, Gift, Building2, AtSign,
    PlusCircle, Trash2, CheckCircle2, ShieldCheck,
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
