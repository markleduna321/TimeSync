import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { usePage } from '@inertiajs/react';
import AdminDashboard from './_sections/AdminDashboard';
import EmployeeDashboard from './_sections/EmployeeDashboard';

const ADMIN_ROLES = ['super_admin', 'admin'];

export default function DashboardPage() {
    const { props } = usePage();
    const roles     = props.auth?.user?.roles ?? [];
    const isAdmin   = roles.some((r) => ADMIN_ROLES.includes(r));

    const userName  = props.auth?.user?.name ?? props.auth?.user?.first_name ?? 'there';

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                    Welcome back, {userName} — here&apos;s what&apos;s happening today.
                </p>
            </div>

            {/* Render the correct dashboard for this role */}
            {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
        </div>
    );
}

DashboardPage.layout = (page) => (
    <MainLayout title="Dashboard">{page}</MainLayout>
);
