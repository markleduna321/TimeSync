import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Coins } from 'lucide-react';
import MonetizationRunPanel from './_sections/MonetizationRunPanel';
import MonetizationTable    from './_sections/MonetizationTable';

function Toast({ msg, onClose }) {
    React.useEffect(() => {
        const t = setTimeout(onClose, 5000);
        return () => clearTimeout(t);
    }, []);

    if (!msg) return null;

    const isError = msg.type === 'error';

    return (
        <div className={[
            'fixed bottom-6 right-6 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
            isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white',
        ].join(' ')}>
            {msg.message}
            <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100">✕</button>
        </div>
    );
}

export default function LeaveMonetizationPage() {
    const [toast, setToast] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRunComplete = (result) => {
        setToast(result);
        if (result.type === 'success') setRefreshKey((k) => k + 1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Coins size={20} className="text-amber-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Leave Monetization</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Year-end conversion of unused monetizable leave credits into cash payouts.
                        Run once after each calendar year closes, then mark records as processed when included in payroll.
                    </p>
                </div>
            </div>

            {/* Run panel */}
            <MonetizationRunPanel onComplete={handleRunComplete} />

            {/* Records table */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                <h2 className="mb-4 text-sm font-semibold text-slate-700">Monetization Records</h2>
                <MonetizationTable key={refreshKey} />
            </div>

            {/* Toast */}
            {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
        </div>
    );
}

LeaveMonetizationPage.layout = (page) => <MainLayout>{page}</MainLayout>;
