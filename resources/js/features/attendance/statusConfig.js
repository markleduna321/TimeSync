// Shared status palette used by ClockWidget, UserTable, and any other
// surface that needs to render a live "current status" pill.
//
// Keys are aligned with the values emitted by the backend
// (App\Services\UserStatusService).
//
// Each entry provides:
//   label    — human-readable text
//   tone     — Tailwind classes for the main pill (bg + text + border)
//   dot      — color of the small status dot
//
// `LABEL_TONES` maps label keys (e.g. "late", "over_break") returned by
// the backend to a sub-badge tone so we can render additive chips.

export const STATUS_CONFIG = {
    clocked_in: {
        label: 'Working',
        dot: 'bg-emerald-500',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    on_lunch: {
        label: 'On Lunch',
        dot: 'bg-amber-500',
        tone: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    on_break: {
        label: 'On Break',
        dot: 'bg-sky-500',
        tone: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    clocked_out: {
        label: 'Clocked Out',
        dot: 'bg-slate-400',
        tone: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    not_clocked_in: {
        label: 'Not Clocked In',
        dot: 'bg-slate-300',
        tone: 'bg-slate-50 text-slate-600 border-slate-200',
    },
    on_leave: {
        label: 'On Leave',
        dot: 'bg-violet-500',
        tone: 'bg-violet-50 text-violet-700 border-violet-200',
    },
    holiday: {
        label: 'Holiday',
        dot: 'bg-cyan-500',
        tone: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    off: {
        label: 'Off',
        dot: 'bg-slate-300',
        tone: 'bg-slate-50 text-slate-500 border-slate-200',
    },
};

// Sub-badge tones for additive labels (Late, Over Break, Over Lunch).
export const LABEL_TONES = {
    late: {
        label: 'Late',
        tone: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    over_break: {
        label: 'Over Break',
        tone: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    over_lunch: {
        label: 'Over Lunch',
        tone: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    on_leave: {
        label: 'On Leave',
        tone: 'bg-violet-50 text-violet-700 border-violet-200',
    },
    holiday: {
        label: 'Holiday',
        tone: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
};

/**
 * Resolve a config for a state. Falls back to `not_clocked_in` so missing
 * values never blow up the UI.
 */
export function getStatusConfig(state) {
    return STATUS_CONFIG[state] ?? STATUS_CONFIG.not_clocked_in;
}

/**
 * Resolve a tone for a label key. Falls back to neutral slate.
 */
export function getLabelTone(key) {
    return LABEL_TONES[key] ?? {
        label: key,
        tone: 'bg-slate-50 text-slate-600 border-slate-200',
    };
}
