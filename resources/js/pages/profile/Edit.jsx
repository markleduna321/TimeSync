import React, { useEffect, useRef, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetUserQuery } from '@/store';
import { useUploadAvatarMutation, useUpdateEmailMutation, useUpdatePasswordMutation } from '@/features/user/userApi';
import { useGetMyLeaveProfileQuery } from '@/features/leave/leaveApi';
import { Camera, Check, Eye, EyeOff, KeyRound, Loader2, Mail, User, CalendarCheck, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

/* ── Shared field styles ─────────────────────────────────────────── */
const fieldCls = (err) =>
    `block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
        err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500'
    }`;

/* ── Inline success/error banner ─────────────────────────────────── */
function Banner({ type, message }) {
    if (!message) return null;
    const styles = type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-rose-50 border-rose-200 text-rose-700';
    return (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${styles}`}>
            {type === 'success' && <Check size={14} strokeWidth={2.5} />}
            {message}
        </div>
    );
}

/* ── Card wrapper ─────────────────────────────────────────────────── */
function Card({ title, icon: Icon, children }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4">
                <Icon size={16} className="text-indigo-600" strokeWidth={2.5} />
                <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">{children}</div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════
   Avatar Section
   ════════════════════════════════════════════════════════════════════ */
function AvatarSection({ user }) {
    const fileRef = useRef(null);
    const [preview, setPreview]   = useState(null);
    const [banner, setBanner]     = useState(null);
    const [uploadAvatar, { isLoading }] = useUploadAvatarMutation();

    const src = preview ?? user?.avatar_url ?? null;
    const initials = user
        ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
        : '';

    async function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // local preview
        const url = URL.createObjectURL(file);
        setPreview(url);
        setBanner(null);

        try {
            await uploadAvatar(file).unwrap();
            setBanner({ type: 'success', message: 'Profile picture updated.' });
        } catch (err) {
            setPreview(null);
            const msg = err?.data?.errors?.avatar?.[0] ?? err?.data?.message ?? 'Upload failed.';
            setBanner({ type: 'error', message: msg });
        }

        // reset so same file can be re-selected
        e.target.value = '';
    }

    return (
        <Card title="Profile Picture" icon={User}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar circle */}
                <div className="relative shrink-0">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-slate-200 bg-indigo-100">
                        {src ? (
                            <img src={src} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-indigo-600">
                                {initials}
                            </div>
                        )}
                    </div>
                    {/* Upload overlay button */}
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={isLoading}
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-60 transition"
                        aria-label="Upload profile picture"
                    >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>

                {/* Info + status */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-base font-semibold text-slate-800">{user?.name}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    {user?.roles?.length > 0 && (
                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                            {user.roles.map((r) => (
                                <span key={r.id} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                    {r.name}
                                </span>
                            ))}
                        </div>
                    )}
                    {banner && <Banner type={banner.type} message={banner.message} />}
                    <p className="text-xs text-slate-400">JPG, PNG, GIF or WebP · max 2 MB</p>
                </div>
            </div>
        </Card>
    );
}

/* ════════════════════════════════════════════════════════════════════
   Email Section
   ════════════════════════════════════════════════════════════════════ */
function EmailSection({ currentEmail }) {
    const [form, setForm]     = useState({ email: '', current_password: '' });
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState(null);
    const [showPw, setShowPw] = useState(false);
    const [updateEmail, { isLoading }] = useUpdateEmailMutation();

    useEffect(() => {
        if (currentEmail) setForm((f) => ({ ...f, email: currentEmail }));
    }, [currentEmail]);

    function set(field, val) {
        setForm((f) => ({ ...f, [field]: val }));
        setErrors((e) => ({ ...e, [field]: undefined }));
        setBanner(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setBanner(null);
        try {
            await updateEmail({ email: form.email, current_password: form.current_password }).unwrap();
            setForm((f) => ({ ...f, current_password: '' }));
            setBanner({ type: 'success', message: 'Email address updated.' });
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
            else setBanner({ type: 'error', message: err?.data?.message ?? 'Update failed.' });
        }
    }

    return (
        <Card title="Email Address" icon={Mail}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">New Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        className={fieldCls(errors.email)}
                        placeholder="you@company.com"
                        autoComplete="email"
                    />
                    {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email[0]}</p>}
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
                    <div className="relative">
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={form.current_password}
                            onChange={(e) => set('current_password', e.target.value)}
                            className={fieldCls(errors.current_password) + ' pr-10'}
                            placeholder="Enter your current password to confirm"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            tabIndex={-1}
                        >
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {errors.current_password && <p className="mt-1 text-xs text-rose-600">{errors.current_password[0]}</p>}
                </div>

                {banner && <Banner type={banner.type} message={banner.message} />}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    {isLoading ? 'Saving…' : 'Update Email'}
                </button>
            </form>
        </Card>
    );
}

/* ════════════════════════════════════════════════════════════════════
   Password Section
   ════════════════════════════════════════════════════════════════════ */
function PasswordSection() {
    const [form, setForm]     = useState({ current_password: '', password: '', password_confirmation: '' });
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState(null);
    const [show, setShow]     = useState({ current: false, new: false, confirm: false });
    const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

    function set(field, val) {
        setForm((f) => ({ ...f, [field]: val }));
        setErrors((e) => ({ ...e, [field]: undefined }));
        setBanner(null);
    }

    function toggleShow(field) {
        setShow((s) => ({ ...s, [field]: !s[field] }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setBanner(null);
        try {
            await updatePassword({
                current_password:      form.current_password,
                password:              form.password,
                password_confirmation: form.password_confirmation,
            }).unwrap();
            setForm({ current_password: '', password: '', password_confirmation: '' });
            setBanner({ type: 'success', message: 'Password changed successfully.' });
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
            else setBanner({ type: 'error', message: err?.data?.message ?? 'Update failed.' });
        }
    }

    const pwField = (id, label, field, showKey, autocomplete) => (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={show[showKey] ? 'text' : 'password'}
                    value={form[field]}
                    onChange={(e) => set(field, e.target.value)}
                    className={fieldCls(errors[field]) + ' pr-10'}
                    placeholder="••••••••"
                    autoComplete={autocomplete}
                />
                <button
                    type="button"
                    onClick={() => toggleShow(showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                >
                    {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {errors[field] && <p className="mt-1 text-xs text-rose-600">{errors[field][0]}</p>}
        </div>
    );

    return (
        <Card title="Change Password" icon={KeyRound}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {pwField('cur-pw',  'Current Password',  'current_password',      'current', 'current-password')}
                {pwField('new-pw',  'New Password',      'password',              'new',     'new-password')}
                {pwField('conf-pw', 'Confirm New Password', 'password_confirmation', 'confirm', 'new-password')}

                {banner && <Banner type={banner.type} message={banner.message} />}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    {isLoading ? 'Saving…' : 'Change Password'}
                </button>
            </form>
        </Card>
    );
}

/* ════════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════════ */
export default function Edit() {
    const { data: user, isLoading } = useGetUserQuery();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
                <p className="mt-1 text-sm text-slate-500">Manage your profile picture, email address, and password.</p>
            </div>

            <AvatarSection user={user} />
            <LeaveCreditsCard />
            <EmailSection currentEmail={user?.email} />
            <PasswordSection />
        </div>
    );
}

Edit.layout = (page) => <MainLayout>{page}</MainLayout>;

/* ════════════════════════════════════════════════════════════════════
   Leave Credits Card
   ════════════════════════════════════════════════════════════════════ */
function LeaveCreditsCard() {
    const { data, isLoading } = useGetMyLeaveProfileQuery();

    const credits      = data?.data         ?? [];
    const transactions = data?.transactions  ?? [];
    const year         = new Date().getFullYear();

    const TX_ICON = {
        credit: <ArrowDownCircle size={14} className="text-green-500 shrink-0" />,
        debit:  <ArrowUpCircle   size={14} className="text-red-400  shrink-0" />,
    };

    return (
        <Card title={`Leave Credits — ${year}`} icon={CalendarCheck}>
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : credits.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No leave credits assigned for {year}.</p>
            ) : (
                <div className="space-y-2">
                    {credits.map((c) => {
                        const total   = Number(c.total_credits)   || 0;
                        const used    = Number(c.used_credits)    || 0;
                        const balance = Number(c.balance ?? (total - used)) || 0;
                        const pct     = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
                        return (
                            <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                        <span
                                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: c.leave_type?.color }}
                                        />
                                        {c.leave_type?.name}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-800">{balance}</span> / {total} days left
                                    </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                        className="h-1.5 rounded-full"
                                        style={{ width: `${pct}%`, backgroundColor: c.leave_type?.color }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {transactions.length > 0 && (
                <>
                    <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Transactions</p>
                    <ul className="space-y-2">
                        {transactions.map((tx) => (
                            <li key={tx.id} className="flex items-start gap-2 text-sm">
                                {TX_ICON[tx.type] ?? TX_ICON.credit}
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-slate-700">{tx.leave_type?.name ?? '—'}</span>
                                    <span className="mx-1 text-slate-300">·</span>
                                    <span className="text-slate-500 text-xs">{tx.note}</span>
                                </div>
                                <span className={`shrink-0 font-semibold tabular-nums ${
                                    tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                                }`}>
                                    {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toFixed(1)}d
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}

