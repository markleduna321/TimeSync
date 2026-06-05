import React, { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
import { useGetUserQuery } from '@/store';
import { useUpdateEmailMutation, useUpdatePasswordMutation } from '@/features/user/userApi';

const inputCls = (err) =>
    `block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
        err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500'
    }`;

function Banner({ type, message }) {
    if (!message) return null;
    const cls = type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-rose-50 border-rose-200 text-rose-700';
    return (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${cls}`}>
            {type === 'success' && <Check size={14} strokeWidth={2.5} />}
            {message}
        </div>
    );
}

function SectionCard({ icon: Icon, title, children }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
                <Icon size={15} className="text-indigo-600" strokeWidth={2.5} />
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="px-5 py-4 space-y-4">{children}</div>
        </div>
    );
}

/* ── Email Section ─────────────────────────────────────────────────── */
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
        <SectionCard icon={Mail} title="Email Address">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">New Email</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                        className={inputCls(errors.email)} placeholder="you@company.com" autoComplete="email" />
                    {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email[0]}</p>}
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
                    <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={form.current_password}
                            onChange={(e) => set('current_password', e.target.value)}
                            className={inputCls(errors.current_password) + ' pr-10'}
                            placeholder="Confirm with your current password" autoComplete="current-password" />
                        <button type="button" onClick={() => setShowPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {errors.current_password && <p className="mt-1 text-xs text-rose-600">{errors.current_password[0]}</p>}
                </div>
                {banner && <Banner type={banner.type} message={banner.message} />}
                <button type="submit" disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    {isLoading ? 'Saving…' : 'Update Email'}
                </button>
            </form>
        </SectionCard>
    );
}

/* ── Password Section ──────────────────────────────────────────────── */
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
                <input id={id} type={show[showKey] ? 'text' : 'password'} value={form[field]}
                    onChange={(e) => set(field, e.target.value)}
                    className={inputCls(errors[field]) + ' pr-10'}
                    placeholder="••••••••" autoComplete={autocomplete} />
                <button type="button" onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {errors[field] && <p className="mt-1 text-xs text-rose-600">{errors[field][0]}</p>}
        </div>
    );

    return (
        <SectionCard icon={KeyRound} title="Change Password">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {pwField('cur-pw',  'Current Password',      'current_password',      'current', 'current-password')}
                {pwField('new-pw',  'New Password',          'password',              'new',     'new-password')}
                {pwField('conf-pw', 'Confirm New Password',  'password_confirmation', 'confirm', 'new-password')}
                {banner && <Banner type={banner.type} message={banner.message} />}
                <button type="submit" disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    {isLoading ? 'Saving…' : 'Change Password'}
                </button>
            </form>
        </SectionCard>
    );
}

/* ── Main export ───────────────────────────────────────────────────── */
export default function AccountSettingsTab() {
    const { data: user } = useGetUserQuery();
    return (
        <div className="space-y-4">
            <EmailSection currentEmail={user?.email} />
            <PasswordSection />
        </div>
    );
}

