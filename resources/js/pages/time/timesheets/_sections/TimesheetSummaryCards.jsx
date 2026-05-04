import React from 'react';
import { Skeleton } from 'antd';
import { Clock, CalendarDays, TrendingUp } from 'lucide-react';

function fmtMinutes(mins) {
    if (!mins) return '0h 00m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

const CARD_CONFIGS = [
    {
        key:   'total',
        title: 'Total Hours',
        icon:  Clock,
        bg:    'bg-indigo-50',
        iconColor: 'text-indigo-600',
        valueColor: 'text-indigo-700',
    },
    {
        key:   'days',
        title: 'Days Worked',
        icon:  CalendarDays,
        bg:    'bg-emerald-50',
        iconColor: 'text-emerald-600',
        valueColor: 'text-emerald-700',
    },
    {
        key:   'avg',
        title: 'Avg Hours / Day',
        icon:  TrendingUp,
        bg:    'bg-amber-50',
        iconColor: 'text-amber-600',
        valueColor: 'text-amber-700',
    },
];

export default function TimesheetSummaryCards({ logs, isLoading }) {
    const totalMins  = logs.reduce((sum, l) => sum + (l.total_worked_minutes ?? 0), 0);
    const daysWorked = logs.filter((l) => l.clock_in).length;
    const avgMins    = daysWorked > 0 ? Math.round(totalMins / daysWorked) : 0;

    const values = {
        total: fmtMinutes(totalMins),
        days:  String(daysWorked),
        avg:   fmtMinutes(avgMins),
    };

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CARD_CONFIGS.map(({ key, title, icon: Icon, bg, iconColor, valueColor }) => (
                <div
                    key={key}
                    className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                        <Icon size={20} className={iconColor} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">{title}</p>
                        {isLoading ? (
                            <Skeleton.Input active size="small" style={{ width: 80, marginTop: 4 }} />
                        ) : (
                            <p className={`text-xl font-bold tabular-nums ${valueColor}`}>
                                {values[key]}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
