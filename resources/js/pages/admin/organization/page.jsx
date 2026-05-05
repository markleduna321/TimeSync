import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import DepartmentsSection from './_sections/DepartmentsSection';
import AccountsSection from './_sections/AccountsSection';

export default function AdminOrganizationPage() {
    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-800 mb-6">Organization</h1>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DepartmentsSection />
                <AccountsSection />
            </div>
        </div>
    );
}

AdminOrganizationPage.layout = (page) => <MainLayout>{page}</MainLayout>;
