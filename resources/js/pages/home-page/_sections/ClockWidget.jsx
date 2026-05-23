import { useState, useEffect, useCallback } from 'react';
import { Clock, Coffee, Timer, LogIn, LogOut, Play, Square } from 'lucide-react';
import {
    useClockInMutation,
    useClockOutMutation,
    useLunchStartMutation,
    useLunchEndMutation,
    useBreakStartMutation,
    useBreakEndMutation,
} from '@/features/timekeeping/timelogApi';
import { useGetMyBreakConfigQuery } from '@/features/timekeeping/breakConfigApi';

const STATUS_CONFIG = {
    active:      { label: 'Working',       dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', strip: 'bg-emerald-500' },
    on_lunch:    { label: 'On Lunch',      dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       strip: 'bg-amber-500'   },
    on_break:    { label: 'On Break',      dot: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200',             strip: 'bg-sky-500'     },
    clocked_out: { label: 'Clocked Out',   dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 border-slate-200',       strip: 'bg-slate-300'   },
    none:        { label: 'Not Clocked In',dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 border-slate-200',       strip: 'bg-indigo-500'  },
};

function formatDuration(minutes) {
    if (minutes === null || minutes === undefined) return '--:--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

function formatTime(isoString) {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function calcLiveMinutes(timelog, now) {
    if (!timelog?.clock_in) return null;
    const start = new Date(timelog.clock_in);
    let total = Math.floor((now - start) / 60000);

    if (timelog.lunch_start && timelog.lunch_end) {
        total -= Math.floor((new Date(timelog.lunch_end) - new Date(timelog.lunch_start)) / 60000);
    } else if (timelog.lunch_start && !timelog.lunch_end) {
        total -= Math.floor((now - new Date(timelog.lunch_start)) / 60000);
    }

    for (const brk of timelog.breaks ?? []) {
        if (brk.start && brk.end) {
            total -= Math.floor((new Date(brk.end) - new Date(brk.start)) / 60000);
        } else if (brk.start && !brk.end) {
            total -= Math.floor((now - new Date(brk.start)) / 60000);
        }
    }

    return Math.max(0, total);
}

function Spinner() {
    return (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}

function ActionButton({ onClick, loading, disabled, icon: Icon, label, variant = 'primary' }) {
    const variants = {
        primary:   'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200',
        danger:    'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200',
        warning:   'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200',
        secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
            `}
        >
            {loading ? <Spinner /> : <Icon className="w-4 h-4" />}
            {label}
        </button>
    );
}

function TimeStamp({ label, value }) {
    return (
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-800">{value}</p>
        </div>
    );
}

export default function ClockWidget({ timelog, schedule, isLoading }) {
    const [now, setNow] = useState(new Date());
    const [error, setError] = useState(null);

    const { data: breakConfigData } = useGetMyBreakConfigQuery();
    const breakConfig = breakConfigData?.data ?? breakConfigData ?? {};

    const [clockIn,    { isLoading: clockingIn    }] = useClockInMutation();
    const [clockOut,   { isLoading: clockingOut   }] = useClockOutMutation();
    const [lunchStart, { isLoading: startingLunch }] = useLunchStartMutation();
    const [lunchEnd,   { isLoading: endingLunch   }] = useLunchEndMutation();
    const [breakStart, { isLoading: startingBreak }] = useBreakStartMutation();
    const [breakEnd,   { isLoading: endingBreak   }] = useBreakEndMutation();

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const handleAction = useCallback(async (fn) => {
        setError(null);
        try {
            await fn().unwrap();
        } catch (err) {
            setError(err?.data?.message ?? 'An error occurred. Please try again.');
        }
    }, []);

    const status = timelog?.status ?? 'none';
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.none;
    const liveMinutes = status === 'clocked_out'
        ? timelog?.total_worked_minutes
        : calcLiveMinutes(timelog, now);

    const breaks = timelog?.breaks ?? [];
    const break1 = breaks[0];
    const break2 = breaks[1];
    const break1Done = !!(break1?.start && break1?.end);
    const activeBreak = status === 'on_break' ? breaks.find((b) => b.start && !b.end) : null;
    const activeBreakIndex = activeBreak ? breaks.indexOf(activeBreak) + 1 : null;
    const maxBreaks = breakConfig?.break_count ?? 2;
    const breakLimit = breakConfig?.break_duration_minutes ?? 15;
    const breaksAllowed = breakConfig?.break_allowed === true;
    const breakElapsedMinutes = activeBreak
        ? Math.floor((now - new Date(activeBreak.start)) / 60000)
        : null;
    const anyLoading = clockingIn || clockingOut || startingLunch || endingLunch || startingBreak || endingBreak;

    return (
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Color-coded top strip — changes per status */}
            <div className={`h-1 w-full ${cfg.strip} transition-colors duration-500`} />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50">
                            <Clock size={20} className="text-indigo-600" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-800">Time Tracker</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {schedule?.shift_start
                                    ? `Shift ${schedule.shift_start} – ${schedule.shift_end}`
                                    : 'No schedule set'}
                            </p>
                        </div>
                    </div>

                    {/* Live digital clock */}
                    <div className="text-right">
                        <p className="text-2xl font-mono font-bold text-slate-900 tabular-nums leading-none">
                            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Status + elapsed row */}
                <div className="flex items-center justify-between rounded-xl border bg-slate-50 border-slate-100 px-4 py-3 mb-5">
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border ${cfg.badge}`}>
                            {cfg.label}
                        </span>
                        {status === 'on_break' && breakElapsedMinutes !== null && (
                            <span className={`text-xs font-mono font-semibold tabular-nums ${
                                breakElapsedMinutes >= breakLimit
                                    ? 'text-rose-600'
                                    : breakElapsedMinutes >= breakLimit - 2
                                        ? 'text-amber-500'
                                        : 'text-sky-600'
                            }`}>
                                {breakElapsedMinutes}m / {breakLimit}m
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Timer size={14} className="text-slate-400" />
                        <span className="text-slate-800 font-mono font-bold text-sm tabular-nums">
                            {isLoading ? '…' : formatDuration(liveMinutes)}
                        </span>
                    </div>
                </div>

                {/* Timestamps */}
                {timelog?.clock_in && (
                    <div className="grid grid-cols-2 gap-2 mb-5">
                        <TimeStamp label="Clocked In"  value={formatTime(timelog.clock_in)} />
                        <TimeStamp label="Clocked Out" value={formatTime(timelog.clock_out)} />
                        {timelog.lunch_start && (
                            <>
                                <TimeStamp label="Lunch Start" value={formatTime(timelog.lunch_start)} />
                                <TimeStamp label="Lunch End"   value={formatTime(timelog.lunch_end)} />
                            </>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                        <span className="mt-px shrink-0">⚠</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    {status === 'none' && (
                        <ActionButton onClick={() => handleAction(clockIn)} loading={clockingIn} disabled={anyLoading} icon={LogIn} label="Clock In" variant="primary" />
                    )}

                    {status === 'active' && (
                        <>
                            <ActionButton onClick={() => handleAction(clockOut)} loading={clockingOut} disabled={anyLoading} icon={LogOut} label="Clock Out" variant="danger" />
                            {!timelog?.lunch_start && (
                                <ActionButton onClick={() => handleAction(lunchStart)} loading={startingLunch} disabled={anyLoading} icon={Coffee} label="Start Lunch" variant="warning" />
                            )}
                            {breaksAllowed && !break1?.start && (
                                <ActionButton onClick={() => handleAction(breakStart)} loading={startingBreak} disabled={anyLoading} icon={Play} label="Break 1" variant="secondary" />
                            )}
                            {breaksAllowed && maxBreaks >= 2 && break1Done && !break2?.start && (
                                <ActionButton onClick={() => handleAction(breakStart)} loading={startingBreak} disabled={anyLoading} icon={Play} label="Break 2" variant="secondary" />
                            )}
                        </>
                    )}

                    {status === 'on_lunch' && (
                        <ActionButton onClick={() => handleAction(lunchEnd)} loading={endingLunch} disabled={anyLoading} icon={Coffee} label="End Lunch" variant="warning" />
                    )}

                    {status === 'on_break' && (
                        <ActionButton onClick={() => handleAction(breakEnd)} loading={endingBreak} disabled={anyLoading} icon={Square} label={`End Break ${activeBreakIndex ?? ''}`} variant="secondary" />
                    )}

                    {status === 'clocked_out' && (
                        <p className="text-sm font-medium text-slate-500">Day complete — see you tomorrow! 👋</p>
                    )}
                </div>
            </div>
        </div>
    );
}
