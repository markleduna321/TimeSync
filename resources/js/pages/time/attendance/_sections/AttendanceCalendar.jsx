import React from 'react';
import { AlertTriangle } from 'lucide-react';

/* ── Status config ────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    present:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Present'  },
    late:     { bg: 'bg-amber-50',    border: 'border-amber-200',   dot: 'bg-amber-500',   label: 'Late'     },
    absent:   { bg: 'bg-rose-50',     border: 'border-rose-200',    dot: 'bg-rose-500',    label: 'Absent'   },
    rest_day: { bg: 'bg-slate-50',    border: 'border-slate-100',   dot: 'bg-slate-300',   label: 'Rest Day' },
    upcoming: { bg: 'bg-white',       border: 'border-slate-100',   dot: 'bg-slate-200',   label: 'Upcoming' },
};

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtTime(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtTimeStr(timeStr) {
    if (!timeStr) return null;
    return new Date('1970-01-01T' + timeStr).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Returns an array of 42 cells (6 rows × 7 cols, Sun–Sat) for the calendar grid.
 * Cells outside the target month have `inMonth: false`.
 */
function buildCalendarCells(year, month, dayMap) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);

    // Pad start with previous-month days
    const startPad = firstDay.getDay(); // 0=Sun
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        const d = new Date(year, month - 1, 1 - startPad + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const inMonth = d.getMonth() === month - 1;

        cells.push({
            date:    d,
            dateStr,
            inMonth,
            dayData: inMonth ? (dayMap[dateStr] ?? null) : null,
        });
    }

    return cells;
}

/* ── Day cell ─────────────────────────────────────────────────────────── */
function DayCell({ cell, onClick }) {
    const { date, inMonth, dayData } = cell;
    const dayNum = date.getDate();

    if (!inMonth) {
        return (
            <div className="min-h-[72px] rounded-lg bg-slate-50 border border-slate-100 opacity-40" />
        );
    }

    const status = dayData?.status ?? 'upcoming';
    const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.upcoming;
    const isClickable = status !== 'upcoming';

    const hasPendingCorrection =
        dayData?.correction?.status === 'pending' ||
        dayData?.overtime?.status === 'pending';
    const correctionApproved = dayData?.correction?.status === 'approved';
    const clockIn       = dayData?.clock_in_time  ? fmtTimeStr(dayData.clock_in_time)  : fmtTime(dayData?.clock_in);
    const clockOut      = dayData?.clock_out_time ? fmtTimeStr(dayData.clock_out_time) : fmtTime(dayData?.clock_out);
    const undertimeMins  = dayData?.undertime_minutes  ?? 0;
    const overBreakMins  = dayData?.over_break_minutes ?? 0;

    // Build stacked issue list — suppressed when correction is approved
    const issues = [];
    if (!correctionApproved) {
        if (status === 'late')    issues.push({ key: 'late', label: 'Late',              cls: 'text-amber-600' });
        if (undertimeMins > 0)   issues.push({ key: 'ut',   label: `-${undertimeMins}m UT`, cls: 'text-orange-500' });
        if (overBreakMins > 0)   issues.push({ key: 'ob',   label: `+${overBreakMins}m OB`, cls: 'text-rose-600' });
    }

    return (
        <button
            type="button"
            onClick={() => isClickable && onClick(dayData)}
            disabled={!isClickable}
            aria-label={`${date.toLocaleDateString([], { month: 'long', day: 'numeric' })}: ${cfg.label}`}
            className={[
                'relative min-h-[72px] w-full rounded-lg border p-2 text-left transition-all duration-150',
                cfg.bg,
                cfg.border,
                isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400' : 'cursor-default',
            ].join(' ')}
        >
            {/* Day number */}
            <span className="text-xs font-bold text-slate-700">{dayNum}</span>

            {/* Pending correction badge */}
            {hasPendingCorrection && (
                <span
                    className="absolute right-1.5 top-1.5"
                    title="Correction pending"
                    aria-label="Correction pending"
                >
                    <AlertTriangle size={11} className="text-amber-500" />
                </span>
            )}

            {/* Status dot + label */}
            <div className="mt-1.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                    <span className="text-[10px] font-medium text-slate-600 leading-none">
                        {cfg.label}
                    </span>
                </div>
                {clockIn && (
                    <span className="text-[10px] text-slate-400 tabular-nums">{clockIn}</span>
                )}
                {clockOut && (
                    <span className="text-[10px] text-slate-400 tabular-nums">{clockOut}</span>
                )}
                {/* Stacked issue chips */}
                {issues.map(({ key, label, cls }) => (
                    <span key={key} className={`text-[10px] font-semibold tabular-nums ${cls}`}>
                        {label}
                    </span>
                ))}
            </div>
        </button>
    );
}

/* ── Skeleton grid ────────────────────────────────────────────────────── */
function CalendarSkeleton() {
    return (
        <div className="grid grid-cols-7 gap-1.5">
            {DOW_LABELS.map((d) => (
                <div key={d} className="pb-1 text-center text-xs font-semibold text-slate-400">{d}</div>
            ))}
            {[...Array(35)].map((_, i) => (
                <div key={i} className="h-[72px] rounded-lg bg-slate-100 animate-pulse" />
            ))}
        </div>
    );
}

/* ── Legend ───────────────────────────────────────────────────────────── */
function Legend() {
    const statusItems = [
        { label: 'Present',  dot: 'bg-emerald-500' },
        { label: 'Late',     dot: 'bg-amber-500'   },
        { label: 'Absent',   dot: 'bg-rose-500'    },
        { label: 'Rest Day', dot: 'bg-slate-300'   },
    ];
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {statusItems.map(({ label, dot }) => (
                <div key={label} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="text-xs text-slate-500">{label}</span>
                </div>
            ))}
            <div className="flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-500" />
                <span className="text-xs text-slate-500">Correction Pending</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-orange-500">UT</span>
                <span className="text-xs text-slate-500">Undertime</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-rose-600">OB</span>
                <span className="text-xs text-slate-500">Over Break</span>
            </div>
        </div>
    );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function AttendanceCalendar({ days, year, month, isLoading, onDayClick }) {
    if (isLoading) return <CalendarSkeleton />;

    // Build a dateStr → day data map
    const dayMap = {};
    for (const d of days) {
        dayMap[d.date] = d;
    }

    const cells = buildCalendarCells(year, month, dayMap);

    return (
        <div className="space-y-3">
            <Legend />
            <div className="grid grid-cols-7 gap-1.5">
                {DOW_LABELS.map((d) => (
                    <div key={d} className="pb-1 text-center text-xs font-semibold text-slate-400">{d}</div>
                ))}
                {cells.map((cell, i) => (
                    <DayCell key={i} cell={cell} onClick={onDayClick} />
                ))}
            </div>
        </div>
    );
}
