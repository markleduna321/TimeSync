import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Lock, Loader2, Clock } from 'lucide-react';

export default function LoginForm({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function handleSubmit(e) {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    }

    return (
        <div className="flex flex-1 flex-col min-h-screen bg-white">
            {/* Mobile-only brand bar */}
            <div className="flex items-center gap-2.5 px-6 py-4 bg-slate-900 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                    <Clock size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold text-white">TimeSync</span>
            </div>

            {/* ── Main Form Area ───────────────────────────────── */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10 animate-slide-in-right">
                <div className="w-full max-w-md">

                    {/* Header */}
                    <div className="mb-8 animate-fade-in-up">
                        <div className="mb-5 hidden h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg lg:flex">
                            <Clock size={24} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                            Welcome back
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Sign in to your TimeSync account to continue.
                        </p>
                    </div>

                    {/* Status message (e.g. after password reset) */}
                    {status && (
                        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                            {status}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                        {/* Email */}
                        <div
                            className="animate-fade-in-up"
                            style={{ animationDelay: '0.08s' }}
                        >
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail
                                    size={16}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="you@company.com"
                                    autoComplete="email"
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:ring-2 ${
                                        errors.email
                                            ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                                    }`}
                                />
                            </div>
                            {errors.email && (
                                <p
                                    id="email-error"
                                    role="alert"
                                    className="mt-1.5 flex items-center gap-1 text-xs text-red-500"
                                >
                                    <span aria-hidden="true">⚠</span>
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div
                            className="animate-fade-in-up"
                            style={{ animationDelay: '0.16s' }}
                        >
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={16}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    className={`w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all duration-200 focus:ring-2 ${
                                        errors.password
                                            ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:text-indigo-600"
                                >
                                    {showPassword
                                        ? <EyeOff size={16} />
                                        : <Eye size={16} />
                                    }
                                </button>
                            </div>
                            {errors.password && (
                                <p
                                    id="password-error"
                                    role="alert"
                                    className="mt-1.5 flex items-center gap-1 text-xs text-red-500"
                                >
                                    <span aria-hidden="true">⚠</span>
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Remember me + Forgot password */}
                        <div
                            className="flex items-center justify-between animate-fade-in-up"
                            style={{ animationDelay: '0.24s' }}
                        >
                            <label className="flex cursor-pointer select-none items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-600">Remember me</span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                                >
                                    Forgot password?
                                </Link>
                            )}
                        </div>

                        {/* Submit */}
                        <div
                            className="animate-fade-in-up"
                            style={{ animationDelay: '0.32s' }}
                        >
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 active:translate-y-0 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Signing in…
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-3 text-xs text-slate-400">
                                Secure sign‑in via SSL
                            </span>
                        </div>
                    </div>

                    {/* Security badges */}
                    <div
                        className="flex items-center justify-center gap-4 animate-fade-in-up"
                        style={{ animationDelay: '0.4s' }}
                    >
                        {['256-bit SSL', 'Data Encrypted', 'GDPR Ready'].map((badge) => (
                            <span
                                key={badge}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500"
                            >
                                {badge}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="border-t border-slate-100 px-6 py-4">
                <p className="text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()}{' '}
                    <span className="font-semibold text-indigo-600">
                        asuraTECH Solutions
                    </span>
                    {' '}· Online Time Keeping &amp; Payroll System.
                    All rights reserved.
                </p>
            </footer>
        </div>
    );
}
