import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useDispatch, useSelector } from 'react-redux';
import {
    toggleSidebarCollapsed,
    setSidebarOpen,
} from '@/features/ui/uiSlice';
import {
    LayoutDashboard,
    Clock,
    CalendarDays,
    CheckSquare,
    DollarSign,
    FileText,
    Users,
    BarChart2,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
} from 'lucide-react';
import { router } from '@inertiajs/react';

/* ── Nav structure ───────────────────────────────────────────────────── */
const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Time Keeping',
        items: [
            { label: 'My Time',     href: '/time/my-time',    icon: Clock },
            { label: 'Timesheets',  href: '/time/timesheets', icon: CalendarDays },
            { label: 'Attendance',  href: '/time/attendance',  icon: CheckSquare },
        ],
    },
    {
        label: 'Payroll',
        items: [
            { label: 'Overview',  href: '/payroll/overview', icon: DollarSign },
            { label: 'Pay Slips', href: '/payroll/payslips', icon: FileText },
        ],
    },
    {
        label: 'Administration',
        adminOnly: true,
        items: [
            { label: 'Team',     href: '/admin/team',     icon: Users },
            { label: 'Reports',  href: '/admin/reports',  icon: BarChart2 },
            { label: 'Settings', href: '/admin/settings', icon: Settings },
        ],
    },
];

const ADMIN_ROLES = ['super_admin', 'admin'];

function getRoleLabel(role) {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin')       return 'Admin';
    return 'Employee';
}

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function Sidebar() {
    const dispatch   = useDispatch();
    const collapsed  = useSelector((s) => s.ui.sidebarCollapsed);
    const isOpen     = useSelector((s) => s.ui.sidebarOpen);
    const { props, url } = usePage();
    const user       = props.auth?.user;
    const isAdmin    = ADMIN_ROLES.includes(user?.role);

    function handleLogout(e) {
        e.preventDefault();
        router.post(route('logout'));
    }

    /* Active check — prefix match so nested routes highlight parent */
    function isActive(href) {
        if (href === '/dashboard') return url === '/dashboard';
        return url.startsWith(href);
    }

    const W = collapsed ? 'w-[72px]' : 'w-[260px]';

    return (
        <>
            {/* ── Mobile backdrop overlay ──────────────────────── */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => dispatch(setSidebarOpen(false))}
                    aria-hidden="true"
                />
            )}

            {/* ── Sidebar panel ────────────────────────────────── */}
            <aside
                className={[
                    'fixed inset-y-0 left-0 z-30 flex flex-col',
                    'bg-slate-900 transition-all duration-300 ease-in-out',
                    W,
                    /* Mobile: slide in/out */
                    isOpen  ? 'translate-x-0' : '-translate-x-full',
                    /* Desktop: always visible */
                    'lg:translate-x-0 lg:relative lg:z-auto',
                ].join(' ')}
                aria-label="Main navigation"
            >
                {/* Subtle top gradient accent */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-1"
                    style={{
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
                    }}
                />

                {/* ── Brand ──────────────────────────────────── */}
                <div className={`flex h-16 shrink-0 items-center border-b border-white/5 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    {!collapsed && (
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
                                <Clock size={16} className="text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-base font-bold tracking-tight text-white">
                                TimeSync
                            </span>
                        </div>
                    )}
                    {collapsed && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
                            <Clock size={16} className="text-white" strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Collapse toggle — desktop only */}
                    {!collapsed && (
                        <button
                            onClick={() => dispatch(toggleSidebarCollapsed())}
                            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronLeft size={15} />
                        </button>
                    )}
                    {collapsed && (
                        <button
                            onClick={() => dispatch(toggleSidebarCollapsed())}
                            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Expand sidebar"
                        >
                            <ChevronRight size={15} />
                        </button>
                    )}
                </div>

                {/* ── Nav items ──────────────────────────────── */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4" aria-label="Sidebar navigation">
                    {NAV_SECTIONS.map((section) => {
                        if (section.adminOnly && !isAdmin) return null;
                        return (
                            <div key={section.label} className="mb-5">
                                {!collapsed && (
                                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        {section.label}
                                    </p>
                                )}
                                {collapsed && <div className="mb-1 border-t border-white/5" />}

                                <ul className="space-y-0.5">
                                    {section.items.map(({ label, href, icon: Icon }) => {
                                        const active = isActive(href);
                                        return (
                                            <li key={href}>
                                                <Link
                                                    href={href}
                                                    onClick={() => dispatch(setSidebarOpen(false))}
                                                    className={[
                                                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                                        active
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                                                        collapsed ? 'justify-center px-2' : '',
                                                    ].join(' ')}
                                                    aria-current={active ? 'page' : undefined}
                                                    title={collapsed ? label : undefined}
                                                >
                                                    <Icon
                                                        size={17}
                                                        className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                                                        strokeWidth={active ? 2.5 : 1.75}
                                                    />
                                                    {!collapsed && <span>{label}</span>}

                                                    {/* Active indicator dot when collapsed */}
                                                    {collapsed && active && (
                                                        <span className="absolute right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </nav>

                {/* ── User card ──────────────────────────────── */}
                <div className="shrink-0 border-t border-white/5 p-3">
                    <div className={`flex items-center gap-3 rounded-xl p-2.5 ${collapsed ? 'justify-center' : ''}`}>
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white/10">
                            {getInitials(user?.name)}
                        </div>

                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">
                                    {user?.name ?? 'User'}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                    {getRoleLabel(user?.role)}
                                </p>
                            </div>
                        )}

                        {!collapsed && (
                            <button
                                onClick={handleLogout}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Log out"
                                title="Log out"
                            >
                                <LogOut size={15} />
                            </button>
                        )}
                    </div>

                    {/* Collapsed logout */}
                    {collapsed && (
                        <button
                            onClick={handleLogout}
                            className="mt-1.5 flex w-full items-center justify-center rounded-xl py-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Log out"
                            title="Log out"
                        >
                            <LogOut size={15} />
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
}
