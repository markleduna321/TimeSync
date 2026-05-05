import React from 'react';
import { Table, Skeleton } from 'antd';
import { CalendarDays } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────────────── */

const DAY_KEYS   = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function fmtMinutes(mins) {
    if (mins === null || mins === undefined || mins === 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtTime(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Returns an array of 7-day arrays (Mon–Sun) covering the entire month.
 * Days that fall outside the target month are included for grid alignment.
 */
function getWeeksInMonth(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);

    // Find the Monday on or before the first day of the month
    const dow = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow;

    const startMonday = new Date(firstDay);
    startMonday.setDate(firstDay.getDate() + mondayOffset);

    const weeks  = [];
    const cursor = new Date(startMonday);

    while (cursor <= lastDay) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        weeks.push(week);
    }

    return weeks;
}

/**
 * Transforms the flat logs array + month spec into table rows.
 */
function buildWeekRows(logs, year, month) {
    // Build a dateStr → log lookup map
    const logMap = {};
    for (const log of logs) {
        logMap[log.date] = log;
    }

    const today = toDateStr(new Date());
    const weeks = getWeeksInMonth(year, month);

    return weeks.map((weekDays, idx) => {
        const days = {};
        for (let i = 0; i < 7; i++) {
            const d       = weekDays[i];
            const dateStr = toDateStr(d);
            days[DAY_KEYS[i]] = {
                date:      d,
                dateStr,
                log:       logMap[dateStr] ?? null,
                inMonth:   d.getMonth() === month - 1,
                isFuture:  dateStr > today,
            };
        }

        // Label using only days that fall inside the target month
        const monthDays = weekDays.filter((d) => d.getMonth() === month - 1);
        const first = monthDays[0];
        const last  = monthDays[monthDays.length - 1];
        const label = first === last
            ? `${MONTH_SHORT[first.getMonth()]} ${first.getDate()}`
            : `${MONTH_SHORT[first.getMonth()]} ${first.getDate()} – ${last.getDate()}`;

        return { key: `week-${idx}`, label, days };
    });
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function DayCell({ day }) {
    if (!day.inMonth) {
        return <div className="h-full w-full rounded bg-slate-50" />;
    }
    if (day.isFuture) {
        return <span className="text-xs text-slate-300">—</span>;
    }
    const log = day.log;
    if (!log || !log.clock_in) {
        return <span className="text-xs text-slate-300">—</span>;
    }
    const label = fmtMinutes(log.total_worked_minutes);
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-slate-700">
                {label ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums">
                {fmtTime(log.clock_in)}
            </span>
        </div>
    );
}

function WeekTotal({ row }) {
    const total = DAY_KEYS.reduce((sum, key) => {
        const day = row.days[key];
        if (day.inMonth && !day.isFuture && day.log?.total_worked_minutes) {
            return sum + day.log.total_worked_minutes;
        }
        return sum;
    }, 0);

    const label = fmtMinutes(total);
    if (!label) return <span className="text-xs text-slate-300">—</span>;

    return (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 tabular-nums">
            {label}
        </span>
    );
}

/* ── Main component ───────────────────────────────────────────────────── */

export default function WeeklyGrid({ logs, year, month, isLoading }) {
    if (isLoading) {
        return (
            <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} active paragraph={{ rows: 1 }} />
                ))}
            </div>
        );
    }

    const rows = buildWeekRows(logs, year, month);

    // Grand total of all in-month minutes
    const grandTotal = rows.reduce((acc, row) => {
        return acc + DAY_KEYS.reduce((sum, key) => {
            const day = row.days[key];
            if (day.inMonth && !day.isFuture && day.log?.total_worked_minutes) {
                return sum + day.log.total_worked_minutes;
            }
            return sum;
        }, 0);
    }, 0);

    // Per-day totals for the summary row
    const dayTotals = {};
    for (const key of DAY_KEYS) {
        dayTotals[key] = rows.reduce((sum, row) => {
            const day = row.days[key];
            if (day.inMonth && !day.isFuture && day.log?.total_worked_minutes) {
                return sum + day.log.total_worked_minutes;
            }
            return sum;
        }, 0);
    }

    const columns = [
        {
            title:     'Period',
            dataIndex: 'label',
            key:       'period',
            width:     130,
            render:    (label) => (
                <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{label}</span>
            ),
        },
        ...DAY_KEYS.map((key, i) => ({
            title: (
                <span className={key === 'sat' || key === 'sun' ? 'text-slate-400' : ''}>
                    {DAY_LABELS[i]}
                </span>
            ),
            key,
            width: 88,
            render: (_, row) => <DayCell day={row.days[key]} />,
        })),
        {
            title: 'Total',
            key:   'total',
            width: 90,
            render: (_, row) => <WeekTotal row={row} />,
        },
    ];

    const hasAnyLog = logs.length > 0;

    return (
        <Table
            rowKey="key"
            dataSource={rows}
            columns={columns}
            pagination={false}
            scroll={{ x: 860 }}
            locale={{
                emptyText: !hasAnyLog ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <CalendarDays size={36} className="mb-3 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">No records this month</p>
                        <p className="mt-1 text-xs text-slate-400">
                            Time logs will appear here once you start clocking in.
                        </p>
                    </div>
                ) : undefined,
            }}
            summary={() => (
                <Table.Summary fixed>
                    <Table.Summary.Row className="bg-slate-50">
                        <Table.Summary.Cell index={0}>
                            <span className="text-xs font-bold text-slate-700">Monthly Total</span>
                        </Table.Summary.Cell>
                        {DAY_KEYS.map((key, i) => (
                            <Table.Summary.Cell key={key} index={i + 1}>
                                {dayTotals[key] > 0 ? (
                                    <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                                        {fmtMinutes(dayTotals[key])}
                                    </span>
                                ) : null}
                            </Table.Summary.Cell>
                        ))}
                        <Table.Summary.Cell index={8}>
                            {grandTotal > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 tabular-nums">
                                    {fmtMinutes(grandTotal)}
                                </span>
                            ) : (
                                <span className="text-xs text-slate-300">—</span>
                            )}
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                </Table.Summary>
            )}
        />
    );
}
