import React from 'react';
import { useSelector } from 'react-redux';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function MainLayout({ children, title }) {
    const collapsed = useSelector((s) => s.ui.sidebarCollapsed);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">

            {/* ── Sidebar ────────────────────────────── */}
            <Sidebar />

            {/* ── Main column ────────────────────────── */}
            <div className={[
                'flex flex-1 flex-col overflow-hidden transition-all duration-300',
                /* Desktop: shift content when sidebar collapses */
                collapsed ? 'lg:ml-0' : 'lg:ml-0',
            ].join(' ')}>

                {/* Top bar */}
                <Topbar title={title} />

                {/* Scrollable content area */}
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>

                {/* Footer strip */}
                <footer className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
                    <p className="text-center text-xs text-slate-400">
                        &copy; {new Date().getFullYear()}{' '}
                        <span className="font-semibold text-indigo-600">
                            asuraTECH Solutions
                        </span>
                        {' '}· TimeSync. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}

