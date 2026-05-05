import { LogIn, LogOut, Coffee, Play, Square, Clock } from 'lucide-react';

const EVENT_CONFIG = {
    clock_in:    { icon: LogIn,   label: 'Clocked In',    iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    clock_out:   { icon: LogOut,  label: 'Clocked Out',   iconColor: 'text-rose-600',    iconBg: 'bg-rose-50',    dot: 'bg-rose-500'    },
    lunch_start: { icon: Coffee,  label: 'Lunch Started', iconColor: 'text-amber-600',   iconBg: 'bg-amber-50',   dot: 'bg-amber-500'   },
    lunch_end:   { icon: Coffee,  label: 'Lunch Ended',   iconColor: 'text-amber-500',   iconBg: 'bg-amber-50',   dot: 'bg-amber-400'   },
    break_start: { icon: Play,    label: 'Break Started', iconColor: 'text-sky-600',     iconBg: 'bg-sky-50',     dot: 'bg-sky-500'     },
    break_end:   { icon: Square,  label: 'Break Ended',   iconColor: 'text-sky-500',     iconBg: 'bg-sky-50',     dot: 'bg-sky-400'     },
};

function formatTime(isoString) {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function buildEvents(timelog) {
    if (!timelog?.clock_in) return [];

    const events = [];

    if (timelog.clock_in)    events.push({ type: 'clock_in',    time: timelog.clock_in });
    if (timelog.lunch_start) events.push({ type: 'lunch_start', time: timelog.lunch_start });
    if (timelog.lunch_end)   events.push({ type: 'lunch_end',   time: timelog.lunch_end });

    for (const [i, brk] of (timelog.breaks ?? []).entries()) {
        if (brk.start) events.push({ type: 'break_start', time: brk.start, index: i + 1 });
        if (brk.end)   events.push({ type: 'break_end',   time: brk.end,   index: i + 1 });
    }

    if (timelog.clock_out) events.push({ type: 'clock_out', time: timelog.clock_out });

    return events.sort((a, b) => new Date(a.time) - new Date(b.time));
}

function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="h-3.5 bg-slate-100 rounded animate-pulse flex-1" />
            <div className="h-3.5 w-12 bg-slate-100 rounded animate-pulse" />
        </div>
    );
}

export default function TodayTimeline({ timelog, isLoading }) {
    const events = buildEvents(timelog);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-violet-500" />

            <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
                        <Clock size={20} className="text-violet-600" strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Today's Timeline</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Live activity log</p>
                    </div>
                </div>

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 mb-3">
                            <Clock size={26} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">No activity yet today.</p>
                        <p className="text-xs text-slate-400 mt-1">Clock in to start tracking your time.</p>
                    </div>
                )}

                {/* Event list */}
                {!isLoading && events.length > 0 && (
                    <div className="relative">
                        {/* Vertical connector line */}
                        <div className="absolute left-[17px] top-5 bottom-5 w-px bg-slate-100" />

                        <div className="space-y-1">
                            {events.map((event, idx) => {
                                const cfg = EVENT_CONFIG[event.type];
                                const Icon = cfg.icon;
                                const label = event.index !== undefined
                                    ? `${cfg.label} #${event.index}`
                                    : cfg.label;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg} group-hover:scale-110 transition-transform`}>
                                            <Icon size={13} className={cfg.iconColor} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-sm text-slate-700 flex-1 font-medium">{label}</span>
                                        <span className="text-xs text-slate-400 font-mono tabular-nums">
                                            {formatTime(event.time)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
