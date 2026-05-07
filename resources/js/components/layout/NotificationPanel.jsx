import React from 'react';
import {
    Bell,
    ClipboardList,
    CheckCircle,
    XCircle,
    Timer,
    FileText,
    DollarSign,
    CalendarDays,
    CheckCheck,
} from 'lucide-react';
import {
    useGetNotificationsQuery,
    useMarkReadMutation,
    useMarkAllReadMutation,
} from '@/features/notifications/notificationsApi';

/* ── Type → icon / colour config ──────────────────────────── */
const TYPE_CONFIG = {
    correction_filed:   { Icon: ClipboardList, bg: 'bg-indigo-100', text: 'text-indigo-600' },
    correction_reviewed:{ Icon: CheckCircle,   bg: 'bg-green-100',  text: 'text-green-600'  },
    ot_filed:           { Icon: Timer,         bg: 'bg-amber-100',  text: 'text-amber-600'  },
    ot_reviewed:        { Icon: Timer,         bg: 'bg-amber-100',  text: 'text-amber-600'  },
    payslip_draft:      { Icon: FileText,      bg: 'bg-slate-100',  text: 'text-slate-600'  },
    payslip_released:   { Icon: DollarSign,    bg: 'bg-emerald-100',text: 'text-emerald-600'},
    holiday_added:      { Icon: CalendarDays,  bg: 'bg-sky-100',    text: 'text-sky-600'    },
};

// Override icon for reviewed/rejected corrections
function resolveConfig(notif) {
    const key = notif.type;
    if ((key === 'correction_reviewed' || key === 'ot_reviewed') && notif.data?.status === 'rejected') {
        return { Icon: XCircle, bg: 'bg-rose-100', text: 'text-rose-600' };
    }
    return TYPE_CONFIG[key] ?? { Icon: Bell, bg: 'bg-slate-100', text: 'text-slate-500' };
}

/* ── Relative time helper ─────────────────────────────────── */
function relativeTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)      return 'just now';
    if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800)  return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Single notification row ──────────────────────────────── */
function NotifRow({ notif, onMarkRead }) {
    const { Icon, bg, text } = resolveConfig(notif);

    return (
        <button
            onClick={() => !notif.read && onMarkRead(notif.id)}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${!notif.read ? 'bg-indigo-50/40' : ''}`}
        >
            {/* Icon bubble */}
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon size={14} className={text} />
            </span>

            {/* Text */}
            <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug ${notif.read ? 'text-slate-600' : 'font-medium text-slate-800'}`}>
                    {notif.message}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{relativeTime(notif.created_at)}</p>
            </div>

            {/* Unread dot */}
            {!notif.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
            )}
        </button>
    );
}

/* ── Main panel ───────────────────────────────────────────── */
export default function NotificationPanel({ onClose }) {
    const { data, isLoading } = useGetNotificationsQuery(undefined, { pollingInterval: 30000 });
    const [markRead]          = useMarkReadMutation();
    const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation();

    const notifications = data?.data ?? [];
    const unreadCount   = notifications.filter((n) => !n.read).length;

    return (
        <div
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            style={{ width: 360, maxHeight: 520 }}
            role="dialog"
            aria-label="Notifications"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllRead()}
                        disabled={markingAll}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    >
                        <CheckCheck size={12} />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    /* Skeleton rows */
                    <div className="space-y-px p-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl px-2 py-3">
                                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                            <Bell size={22} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">You're all caught up</p>
                        <p className="mt-0.5 text-xs text-slate-400">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notif) => (
                            <NotifRow
                                key={notif.id}
                                notif={notif}
                                onMarkRead={markRead}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
