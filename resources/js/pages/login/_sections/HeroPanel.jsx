import React from 'react';
import { Clock, DollarSign, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';

const features = [
    {
        icon: Clock,
        label: 'Real-Time Tracking',
        desc: 'Accurate clock-in/out for remote teams',
    },
    {
        icon: DollarSign,
        label: 'Automated Payroll',
        desc: 'Compute pay with zero manual errors',
    },
    {
        icon: Users,
        label: 'Team Management',
        desc: 'Manage rosters and work schedules',
    },
    {
        icon: ShieldCheck,
        label: 'Secure & Compliant',
        desc: 'Enterprise-grade data security',
    },
];

export default function HeroPanel() {
    return (
        <div
            className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between p-12 animate-slide-in-left"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)',
            }}
        >
            {/* Animated gradient overlay */}
            <div
                className="absolute inset-0 animate-gradient-shift opacity-25 pointer-events-none"
                style={{
                    background:
                        'linear-gradient(135deg, #4f46e5, #0ea5e9, #7c3aed, #6366f1)',
                }}
            />

            {/* Decorative radial blobs */}
            <div
                className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
                }}
            />
            <div
                className="absolute -bottom-20 -left-20 w-[30rem] h-[30rem] rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)',
                }}
            />

            {/* Spinning outer ring decoration */}
            <div className="absolute top-10 right-10 w-40 h-40 opacity-10 pointer-events-none animate-spin-slow">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                    <circle
                        cx="80" cy="80" r="72"
                        fill="none" stroke="#818cf8"
                        strokeWidth="1.5"
                        strokeDasharray="8 6"
                    />
                    <circle
                        cx="80" cy="80" r="58"
                        fill="none" stroke="#a5b4fc"
                        strokeWidth="1"
                        strokeDasharray="3 10"
                    />
                </svg>
            </div>

            {/* ── TOP BRAND ────────────────────────────────────── */}
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg animate-pulse-glow">
                        <Clock className="text-white" size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-white text-2xl font-bold tracking-tight">
                        TimeSync
                    </span>
                </div>
                <p className="text-indigo-400 text-xs font-semibold tracking-[0.18em] uppercase ml-1">
                    Powered by asuraTECH Solutions
                </p>
            </div>

            {/* ── CENTER ILLUSTRATION ──────────────────────────── */}
            <div className="relative z-10 flex flex-col items-center py-6">
                {/* Clock SVG */}
                <div className="relative w-60 h-60 animate-float">
                    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                        {/* Outer dashed ring */}
                        <circle
                            cx="100" cy="100" r="92"
                            fill="none" stroke="#818cf8"
                            strokeWidth="1.5"
                            strokeDasharray="5 5"
                            opacity="0.3"
                        />
                        {/* Clock face */}
                        <circle cx="100" cy="100" r="76" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="2" />
                        <circle cx="100" cy="100" r="73" fill="none" stroke="#6366f1" strokeWidth="0.8" opacity="0.4" />

                        {/* Hour tick marks */}
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
                            const rad = (angle - 90) * (Math.PI / 180);
                            const outer = 70;
                            const inner = i % 3 === 0 ? 60 : 65;
                            return (
                                <line
                                    key={i}
                                    x1={100 + inner * Math.cos(rad)}
                                    y1={100 + inner * Math.sin(rad)}
                                    x2={100 + outer * Math.cos(rad)}
                                    y2={100 + outer * Math.sin(rad)}
                                    stroke={i % 3 === 0 ? '#a5b4fc' : '#4f46e5'}
                                    strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {/* Hour hand → 9 o'clock */}
                        <line
                            x1="100" y1="100" x2="60" y2="100"
                            stroke="#a5b4fc" strokeWidth="3.5"
                            strokeLinecap="round"
                        />
                        {/* Minute hand → 12 o'clock */}
                        <line
                            x1="100" y1="100" x2="100" y2="40"
                            stroke="#c7d2fe" strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        {/* Second hand */}
                        <line
                            x1="100" y1="112" x2="100" y2="34"
                            stroke="#f472b6" strokeWidth="1.2"
                            strokeLinecap="round"
                            opacity="0.9"
                        />

                        {/* Center pivot */}
                        <circle cx="100" cy="100" r="5.5" fill="#6366f1" />
                        <circle cx="100" cy="100" r="2.5" fill="#e0e7ff" />
                    </svg>

                    {/* Floating badge: Clocked In */}
                    <div
                        className="absolute -right-10 top-4 animate-float-slow flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md"
                        style={{ animationDelay: '0.5s' }}
                    >
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span className="text-white text-xs font-medium">Clocked In</span>
                        <span className="text-indigo-300 text-xs">09:00 AM</span>
                    </div>

                    {/* Floating badge: Today's Pay */}
                    <div
                        className="absolute -left-12 bottom-6 animate-float flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md"
                        style={{ animationDelay: '1.2s' }}
                    >
                        <DollarSign size={13} className="text-yellow-400 shrink-0" />
                        <span className="text-white text-xs font-medium">Today's Pay</span>
                        <span className="text-yellow-300 text-xs font-bold">₱1,840</span>
                    </div>
                </div>

                {/* Tagline */}
                <h1 className="mt-8 text-center text-3xl font-bold leading-tight text-white">
                    Track Hours.{' '}
                    <span className="text-indigo-400">Pay Accurately.</span>
                </h1>
                <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-indigo-300">
                    The smart time‑keeping &amp; payroll platform built for modern
                    work-from-home teams.
                </p>
            </div>

            {/* ── FEATURES GRID ────────────────────────────────── */}
            <div className="relative z-10 grid grid-cols-2 gap-3">
                {features.map(({ icon: Icon, label, desc }) => (
                    <div
                        key={label}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/10"
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20">
                            <Icon size={15} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold leading-tight text-white">
                                {label}
                            </p>
                            <p className="mt-0.5 text-xs leading-tight text-indigo-300">
                                {desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
