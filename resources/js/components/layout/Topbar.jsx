import React, { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '@/features/ui/uiSlice';
import {
    Menu,
    Bell,
    ChevronDown,
    User,
    LogOut,
    Settings,
} from 'lucide-react';
import { useGetUnreadCountQuery } from '@/features/notifications/notificationsApi';
import NotificationPanel from './NotificationPanel';

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

export default function Topbar({ title }) {
    const dispatch = useDispatch();
    const { props } = usePage();
    const user = props.auth?.user;

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen]       = useState(false);
    const dropdownRef = useRef(null);
    const notifRef    = useRef(null);

    const { data: countData } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });
    const unreadCount = countData?.unread ?? 0;

    /* Close dropdown on outside click */
    useEffect(() => {
        function handleOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    /* Close both panels on Escape */
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') {
                setDropdownOpen(false);
                setNotifOpen(false);
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    function handleLogout(e) {
        e.preventDefault();
        setDropdownOpen(false);
        router.post(route('logout'));
    }

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">

            {/* ── Left: hamburger + page title ─────────────── */}
            <div className="flex items-center gap-4">
                {/* Mobile hamburger */}
                <button
                    onClick={() => dispatch(toggleSidebar())}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:hidden"
                    aria-label="Toggle navigation menu"
                >
                    <Menu size={20} />
                </button>

                {title && (
                    <div className="hidden sm:block">
                        <h1 className="text-base font-semibold text-slate-900">
                            {title}
                        </h1>
                    </div>
                )}
            </div>

            {/* ── Right: notifications + user ──────────────── */}
            <div className="flex items-center gap-2">

                {/* Notification bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setNotifOpen((v) => !v); setDropdownOpen(false); }}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Notifications"
                        aria-haspopup="true"
                        aria-expanded={notifOpen}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span
                                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                                aria-label={`${unreadCount} unread notifications`}
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification panel dropdown */}
                    {notifOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2">
                            <NotificationPanel onClose={() => setNotifOpen(false)} />
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />

                {/* User dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => { setDropdownOpen((v) => !v); setNotifOpen(false); }}
                        aria-haspopup="true"
                        aria-expanded={dropdownOpen}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {/* Avatar */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                            {getInitials(user?.name)}
                        </div>

                        {/* Name — hidden on very small screens */}
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium leading-tight text-slate-800">
                                {user?.name ?? 'User'}
                            </p>
                            <p className="text-xs leading-tight text-slate-400">
                                {user?.email ?? ''}
                            </p>
                        </div>

                        <ChevronDown
                            size={14}
                            className={`hidden sm:block shrink-0 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown menu */}
                    {dropdownOpen && (
                        <div
                            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-200/60"
                            role="menu"
                            aria-orientation="vertical"
                        >
                            {/* User info header */}
                            <div className="border-b border-slate-100 px-4 py-3">
                                <p className="text-sm font-semibold text-slate-900">
                                    {user?.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400 truncate">
                                    {user?.email}
                                </p>
                            </div>

                            <div className="border-t border-slate-100 py-1">
                                <button
                                    onClick={handleLogout}
                                    role="menuitem"
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:bg-red-50"
                                >
                                    <LogOut size={15} className="shrink-0" />
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
