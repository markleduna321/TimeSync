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
    Calendar,
    CalendarDays,
    CheckSquare,
    DollarSign,
    FileText,
    Layers,
    Network,
    Users,
    Users2,
    BarChart2,
    Coins,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
} from 'lucide-react';
import { router } from '@inertiajs/react';

/* ── Role helpers ────────────────────────────────────────────────────── */
const ROLE_LEVEL = { super_admin: 5, admin: 4, manager: 3, team_lead: 2, employee: 1 };
const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', team_lead: 'Team Lead', employee: 'Employee' };

function hasRole(roles, ...slugs) {
    return slugs.some((s) => roles.includes(s));
}

function getPrimaryRoleLabel(roles) {
    if (!roles?.length) return 'Employee';
    const top = [...roles].sort((a, b) => (ROLE_LEVEL[b] ?? 0) - (ROLE_LEVEL[a] ?? 0))[0];
    return ROLE_LABEL[top] ?? top;
}

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
            { label: 'Pay Slips',   href: '/time/payslips',   icon: FileText },
        ],
    },
    {
        label: 'Administration',
        items: [
            {
                label: 'Payroll',
                href: '/admin/payroll',
                icon: DollarSign,
                roles: ['super_admin', 'admin', 'manager'],
            },
            {
                label: 'Holidays',
                href: '/admin/holidays',
                icon: Calendar,
                roles: ['super_admin', 'admin'],
            },
            {
                label: 'Users',
                href: '/admin/users',
                icon: Users,
                roles: ['super_admin', 'admin'],
            },
            {
                label: 'Compensation',
                href: '/admin/compensation',
                icon: Layers,
                roles: ['super_admin', 'admin'],
            },
            {
                label: 'Organization',
                href: '/admin/organization',
                icon: Network,
                roles: ['super_admin', 'admin'],
            },
            {
                label: 'Teams',
                href: '/teams',
                icon: Users2,
                roles: ['super_admin', 'admin', 'manager', 'team_lead'],
            },
            {
                label: 'Reports',
                href: '/admin/reports',
                icon: BarChart2,
                roles: ['super_admin', 'admin', 'manager'],
            },
            {
                label: 'Leave Monetization',
                href: '/admin/leave-monetization',
                icon: Coins,
                roles: ['super_admin', 'admin'],
            },
        ],
    },
];

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
    const userRoles  = user?.roles ?? []; // array of slugs

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
                        // Filter items the user is allowed to see
                        const visibleItems = section.items.filter((item) => {
                            if (!item.roles) return true; // no restriction
                            return hasRole(userRoles, ...item.roles);
                        });
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={section.label} className="mb-5">
                                {!collapsed && (
                                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        {section.label}
                                    </p>
                                )}
                                {collapsed && <div className="mb-1 border-t border-white/5" />}

                                <ul className="space-y-0.5">
                                    {visibleItems.map(({ label, href, icon: Icon }) => {
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

                
            </aside>
        </>
    );
}
