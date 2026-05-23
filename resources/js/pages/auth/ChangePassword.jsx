import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Eye, EyeOff, Lock, Loader2, ShieldCheck } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function ChangePassword() {
    const [showPassword, setShowPassword]   = useState(false);
    const [showConfirm,  setShowConfirm]    = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        password:              '',
        password_confirmation: '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        post(route('password.change.update'));
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

                {/* Icon + heading */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-md">
                        <ShieldCheck size={28} className="text-white" strokeWidth={2} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Set a New Password</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        For your security, please choose a new password before continuing.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                    {/* New Password */}
                    <div>
                        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                            New Password
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
                                placeholder="Min. 8 characters"
                                autoComplete="new-password"
                                className={`w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all duration-200 focus:ring-2 ${
                                    errors.password
                                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Lock
                                size={16}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                id="password_confirmation"
                                type={showConfirm ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="Repeat your new password"
                                autoComplete="new-password"
                                className={`w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all duration-200 focus:ring-2 ${
                                    errors.password_confirmation
                                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                tabIndex={-1}
                            >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password_confirmation && (
                            <p className="mt-1.5 text-xs text-red-500">{errors.password_confirmation}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {processing && <Loader2 size={16} className="animate-spin" />}
                        {processing ? 'Saving…' : 'Set New Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

ChangePassword.layout = (page) => <GuestLayout>{page}</GuestLayout>;
