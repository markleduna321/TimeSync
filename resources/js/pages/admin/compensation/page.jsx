import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import DeductionTypesSection from './_sections/DeductionTypesSection';
import AllowanceTypesSection from './_sections/AllowanceTypesSection';

export default function AdminCompensationPage() {
    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-800 mb-6">Compensation Types</h1>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DeductionTypesSection />
                <AllowanceTypesSection />
            </div>
        </div>
    );
}

AdminCompensationPage.layout = (page) => <MainLayout>{page}</MainLayout>;
