import React, { useState } from 'react';
import { Modal, Checkbox } from 'antd';
import { AlertTriangle, Play } from 'lucide-react';
import { useRunLeaveMonetizationMutation } from '@/features/leave/leaveApi';

const CURRENT_YEAR = new Date().getFullYear();

const PAST_YEARS = Array.from(
    { length: CURRENT_YEAR - 2020 },
    (_, i) => CURRENT_YEAR - 1 - i
);

export default function MonetizationRunPanel({ onComplete }) {
    const [year,    setYear]    = useState(CURRENT_YEAR - 1);
    const [force,   setForce]   = useState(false);
    const [confirm, setConfirm] = useState(false);

    const [run, { isLoading }] = useRunLeaveMonetizationMutation();

    const availableYears = force
        ? [CURRENT_YEAR, ...PAST_YEARS]
        : PAST_YEARS;

    const handleConfirm = async () => {
        try {
            const result = await run({ year, force }).unwrap();
            setConfirm(false);
            onComplete?.({
                type: 'success',
                message: `Done — ${result.created} record(s) created, ${result.skipped} skipped.`,
            });
        } catch (err) {
            setConfirm(false);
            onComplete?.({
                type: 'error',
                message: err?.data?.message ?? 'Something went wrong. Please try again.',
            });
        }
    };

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h2 className="font-semibold text-amber-900">Year-End Leave Monetization</h2>
                    <p className="mt-1 text-sm text-amber-700">
                        Converts unused monetizable leave credits for a given year into pending cash payout records.
                        Credits will be zeroed out and cannot be restored. Run this once per year after the year ends.
                    </p>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-4">
                {/* Year selector */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Target Year</label>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Force checkbox */}
                <div className="flex items-center gap-2 pb-2">
                    <Checkbox
                        checked={force}
                        onChange={(e) => {
                            setForce(e.target.checked);
                            if (!e.target.checked && year === CURRENT_YEAR) {
                                setYear(CURRENT_YEAR - 1);
                            }
                        }}
                    >
                        <span className="text-sm text-slate-600">Allow current year (mid-year run)</span>
                    </Checkbox>
                </div>

                {/* Run button */}
                <button
                    onClick={() => setConfirm(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                >
                    <Play size={14} />
                    Run Monetization for {year}
                </button>
            </div>

            {/* Confirm modal */}
            <Modal
                open={confirm}
                onCancel={() => setConfirm(false)}
                onOk={handleConfirm}
                okText="Yes, Run Monetization"
                okButtonProps={{ danger: true, loading: isLoading }}
                cancelText="Cancel"
                title={
                    <span className="flex items-center gap-2 text-red-600">
                        <AlertTriangle size={16} />
                        Confirm Year-End Monetization
                    </span>
                }
            >
                <p className="text-slate-700 text-sm">
                    This will <strong>permanently zero out</strong> all unused monetizable leave credits for{' '}
                    <strong>{year}</strong> and create pending cash payout records for each affected employee.
                </p>
                <p className="mt-3 text-sm text-red-600 font-medium">
                    This action cannot be undone. Are you sure you want to proceed?
                </p>
            </Modal>
        </div>
    );
}
