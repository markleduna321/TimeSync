/**
 * Segmented control that switches between "Days-Worked" and "Flat Rate"
 * computation methods for payslip generation.
 *
 * Why a single shared `payrollMethod` state? Both the single Generate modal
 * and the Bulk Draft modal should follow the same method so an admin
 * never has to wonder why their two flows produced different numbers.
 */
export default function MethodToggle({ value, onChange, className = '' }) {
    const options = [
        { value: 'days_worked', label: 'Days-Worked' },
        { value: 'flat_rate',   label: 'Flat Rate' },
    ];

    return (
        <div
            className={`inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium ${className}`}
            role="group"
            aria-label="Payroll method"
        >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={[
                            'rounded-lg px-3 py-1.5 transition-all duration-150',
                            active
                                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                                : 'text-slate-500 hover:text-slate-700',
                        ].join(' ')}
                        aria-pressed={active}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
