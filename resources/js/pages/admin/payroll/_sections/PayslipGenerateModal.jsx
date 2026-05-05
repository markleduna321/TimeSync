import React, { useState, useEffect } from 'react';
import { Modal, Spin, Select } from 'antd';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useGeneratePayslipMutation } from '@/features/payroll/payrollApi';
import { useGetUsersQuery } from '@/features/users/usersApi';

const DEFAULT_FORM = { user_id: '', period_start: '', period_end: '', pay_date: '', incentive_amount: '', incentive_description: '', prior_period_amount: '', prior_period_start: '', prior_period_end: '' };

/**
 * Build quick-fill dates for a cutoff in a given month/year.
 * 1st cutoff: 1–15. 2nd cutoff: 16–last day.
 */
function getCutoffDates(cutoff, year, month) {
    if (cutoff === 'first') {
        return {
            start: `${year}-${String(month).padStart(2, '0')}-01`,
            end:   `${year}-${String(month).padStart(2, '0')}-15`,
        };
    }
    const lastDay = new Date(year, month, 0).getDate();
    return {
        start: `${year}-${String(month).padStart(2, '0')}-16`,
        end:   `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
    };
}

function detectCutoffLabel(periodEnd) {
    if (!periodEnd) return null;
    return parseInt(periodEnd.split('-')[2], 10) <= 15 ? 'first' : 'second';
}

export default function PayslipGenerateModal({ open, onClose }) {
    const [form, setForm]       = useState(DEFAULT_FORM);
    const [errors, setErrors]   = useState({});
    const [showExtra, setShowExtra] = useState(false);

    const { data: usersData }       = useGetUsersQuery({ per_page: 200 });
    const [generate, { isLoading }] = useGeneratePayslipMutation();

    const users      = usersData?.data ?? [];
    const now        = new Date();
    const thisYear   = now.getFullYear();
    const thisMonth  = now.getMonth() + 1; // 1-based

    const detectedCutoff = detectCutoffLabel(form.period_end);

    useEffect(() => {
        if (!open) return;
        setForm(DEFAULT_FORM);
        setErrors({});
        setShowExtra(false);
    }, [open]);

    function set(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    function quickFill(cutoff) {
        const { start, end } = getCutoffDates(cutoff, thisYear, thisMonth);
        setForm((f) => ({ ...f, period_start: start, period_end: end }));
        setErrors((e) => ({ ...e, period_start: undefined, period_end: undefined }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        try {
            await generate({
                user_id:               Number(form.user_id),
                period_start:          form.period_start,
                period_end:            form.period_end,
                pay_date:              form.pay_date || null,
                incentive_amount:      form.incentive_amount ? parseFloat(form.incentive_amount) : null,
                incentive_description: form.incentive_description || null,
                prior_period_amount:   form.prior_period_amount ? parseFloat(form.prior_period_amount) : null,
                prior_period_start:    form.prior_period_start || null,
                prior_period_end:      form.prior_period_end || null,
            }).unwrap();
            onClose();
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
            else if (err?.status === 409) setErrors({ period_start: [err.data?.message ?? 'A payslip already exists for this period.'] });
        }
    }

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={
                <div className="flex items-center gap-2 text-slate-800">
                    <FileText size={17} className="text-indigo-500" />
                    Generate Payslip
                </div>
            }
            destroyOnHidden
        >
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* Employee */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="ps-user">
                        Employee
                    </label>
                    <Select
                        id="ps-user"
                        showSearch
                        allowClear
                        placeholder="Select employee…"
                        value={form.user_id || null}
                        onChange={(val) => set('user_id', val ?? '')}
                        filterOption={(input, option) => {
                            const q = input.toLowerCase();
                            return (option?.label ?? '').toLowerCase().includes(q) || (option?.email ?? '').toLowerCase().includes(q);
                        }}
                        options={users.map((u) => ({ value: u.id, label: u.name, email: u.email ?? '' }))}
                        optionRender={(option) => (
                            <div>
                                <p className="text-sm font-medium text-slate-800">{option.data.label}</p>
                                {option.data.email && <p className="text-xs text-slate-400">{option.data.email}</p>}
                            </div>
                        )}
                        disabled={isLoading}
                        style={{ width: '100%', marginTop: 4 }}
                        status={errors.user_id ? 'error' : ''}
                        popupMatchSelectWidth={false}
                    />
                    {errors.user_id && <p className="mt-1 text-xs text-rose-600">{errors.user_id[0]}</p>}
                </div>

                {/* Cutoff quick-select */}
                <div>
                    <p className="text-sm font-medium text-slate-700 mb-1.5">Cutoff Period</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => quickFill('first')}
                            disabled={isLoading}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${detectedCutoff === 'first' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span className="block font-semibold">1st Cutoff</span>
                            <span className="block text-xs font-normal opacity-70">1–15 · ½ govt. deductions · semi-monthly WHT</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => quickFill('second')}
                            disabled={isLoading}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${detectedCutoff === 'second' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span className="block font-semibold">2nd Cutoff</span>
                            <span className="block text-xs font-normal opacity-70">16–EOM · ½ govt. deductions · cumulative WHT</span>
                        </button>
                    </div>
                    {detectedCutoff && (
                        <p className="mt-1.5 text-xs text-indigo-600 font-medium">
                            {detectedCutoff === 'first'
                                ? '1st cutoff — SSS, PhilHealth & Pag-IBIG at ½ monthly rate. WHT via semi-monthly BIR table.'
                                : '2nd cutoff — SSS, PhilHealth & Pag-IBIG at ½ monthly rate. WHT via cumulative monthly adjustment (TRAIN).'}
                        </p>
                    )}
                </div>

                {/* Period */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700" htmlFor="ps-start">
                            Period Start
                        </label>
                        <input
                            id="ps-start"
                            type="date"
                            value={form.period_start}
                            onChange={(e) => set('period_start', e.target.value)}
                            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.period_start ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                            disabled={isLoading}
                        />
                        {errors.period_start && <p className="mt-1 text-xs text-rose-600">{errors.period_start[0]}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700" htmlFor="ps-end">
                            Period End
                        </label>
                        <input
                            id="ps-end"
                            type="date"
                            value={form.period_end}
                            onChange={(e) => set('period_end', e.target.value)}
                            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.period_end ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                            disabled={isLoading}
                        />
                        {errors.period_end && <p className="mt-1 text-xs text-rose-600">{errors.period_end[0]}</p>}
                    </div>
                </div>

                {/* Pay Date */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="ps-paydate">
                        Pay Date <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                        id="ps-paydate"
                        type="date"
                        value={form.pay_date}
                        onChange={(e) => set('pay_date', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    />
                </div>

                {/* Additional Earnings */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowExtra((v) => !v)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
                    >
                        <span className="text-sm font-medium text-slate-700">
                            Additional Earnings <span className="text-slate-400 font-normal">(optional)</span>
                        </span>
                        {showExtra ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>
                {showExtra && <div className="px-3 pb-3 space-y-4 border-t border-slate-100 pt-3">

                    {/* Prior Period Adjustment */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prior Period Adjustment</p>
                        <p className="text-xs text-slate-400">Use this to add pay from a previous missed or partial cutoff onto this payslip. A separate earning line will be created.</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-600" htmlFor="ps-pp-amt">Amount (₱)</label>
                                <input
                                    id="ps-pp-amt"
                                    type="number" min="0" step="0.01"
                                    value={form.prior_period_amount}
                                    onChange={(e) => set('prior_period_amount', e.target.value)}
                                    className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.prior_period_amount ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'}`}
                                    placeholder="0.00"
                                    disabled={isLoading}
                                />
                                {errors.prior_period_amount && <p className="mt-0.5 text-xs text-rose-600">{errors.prior_period_amount[0]}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600" htmlFor="ps-pp-start">Period From</label>
                                <input
                                    id="ps-pp-start"
                                    type="date"
                                    value={form.prior_period_start}
                                    onChange={(e) => set('prior_period_start', e.target.value)}
                                    className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.prior_period_start ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'}`}
                                    disabled={isLoading}
                                />
                                {errors.prior_period_start && <p className="mt-0.5 text-xs text-rose-600">{errors.prior_period_start[0]}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600" htmlFor="ps-pp-end">Period To</label>
                                <input
                                    id="ps-pp-end"
                                    type="date"
                                    value={form.prior_period_end}
                                    onChange={(e) => set('prior_period_end', e.target.value)}
                                    className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.prior_period_end ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'}`}
                                    disabled={isLoading}
                                />
                                {errors.prior_period_end && <p className="mt-0.5 text-xs text-rose-600">{errors.prior_period_end[0]}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200" />

                    {/* Incentive / Bonus */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incentive / Bonus</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600" htmlFor="ps-inc-amt">Amount (₱)</label>
                                <input
                                    id="ps-inc-amt"
                                    type="number" min="0" step="0.01"
                                    value={form.incentive_amount}
                                    onChange={(e) => set('incentive_amount', e.target.value)}
                                    className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.incentive_amount ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'}`}
                                    placeholder="0.00"
                                    disabled={isLoading}
                                />
                                {errors.incentive_amount && <p className="mt-0.5 text-xs text-rose-600">{errors.incentive_amount[0]}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600" htmlFor="ps-inc-desc">Description</label>
                                <input
                                    id="ps-inc-desc"
                                    type="text"
                                    value={form.incentive_description}
                                    onChange={(e) => set('incentive_description', e.target.value)}
                                    className={`mt-0.5 block w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.incentive_description ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'}`}
                                    placeholder="e.g. Performance Bonus"
                                    disabled={isLoading}
                                />
                                {errors.incentive_description && <p className="mt-0.5 text-xs text-rose-600">{errors.incentive_description[0]}</p>}
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400">Both are taxable — included in WHT computation for this cutoff.</p>
                </div>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                        {isLoading && <Spin size="small" />}
                        Generate
                    </button>
                </div>
            </form>
        </Modal>
    );
}
