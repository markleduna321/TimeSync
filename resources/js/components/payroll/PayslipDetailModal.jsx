import React, { useRef } from "react";
import { Modal } from "antd";
import { Printer } from "lucide-react";
import { useGetPayslipQuery } from "@/features/payroll/payrollApi";

/* Formatters */
function fmtCurrency(val) {
    if (val == null) return "\u2014";
    return "\u20b1" + Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}
function fmtMinutes(mins) {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
function fmtDate(d) {
    if (!d) return "\u2014";
    return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}
function fmtShort(d) {
    if (!d) return "\u2014";
    return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/* Sub-components */
function SectionHead({ children }) {
    return (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {children}
        </p>
    );
}
function AttRow({ label, value, cls = "text-slate-800" }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-xs font-semibold tabular-nums ${cls}`}>{value}</span>
        </div>
    );
}
function LineRow({ description, amount, isDeduction }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-600 leading-snug">{description}</span>
            <span className={`text-xs tabular-nums font-medium shrink-0 ml-3 ${isDeduction ? "text-rose-600" : "text-slate-800"}`}>
                {isDeduction ? `(${fmtCurrency(amount)})` : fmtCurrency(amount)}
            </span>
        </div>
    );
}
function SubRow({ label, value, rose }) {
    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg mt-2 ${rose ? "bg-rose-50" : "bg-slate-50"}`}>
            <span className="text-xs font-semibold text-slate-700">{label}</span>
            <span className={`text-sm font-bold tabular-nums ${rose ? "text-rose-600" : "text-slate-900"}`}>{value}</span>
        </div>
    );
}
function MetaField({ label, value }) {
    return (
        <div className="text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-widest text-indigo-300">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
        </div>
    );
}

/* Print handler — opens new window, injects minimal CSS, triggers print dialog */
const PRINT_CSS = `
@page{size:A4 landscape;margin:8mm 10mm;}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
html,body{margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;}
/* scale entire payslip to guarantee single-page fit */
.print-root{zoom:0.75;}
.no-print{display:none!important;}
/* ── always treat as ≥sm breakpoint in print ── */
.sm\\:grid-cols-2{grid-template-columns:1fr 1fr!important;}
.sm\\:flex-row{flex-direction:row!important;}
.sm\\:items-center{align-items:center!important;}
.sm\\:justify-between{justify-content:space-between!important;}
.sm\\:border-r{border-right:1px solid #f1f5f9!important;}
.sm\\:border-b-0{border-bottom:none!important;}
.sm\\:px-6{padding-left:20px!important;padding-right:20px!important;}
.sm\\:px-7{padding-left:24px!important;padding-right:24px!important;}
.sm\\:gap-0{gap:0!important;}
.sm\\:gap-6{gap:20px!important;}
.sm\\:text-right{text-align:right!important;}
/* collapse flex-1 spacer so deductions+net pay are compact */
.flex-1{flex:0 0 auto!important;}
/* layout */
.flex{display:flex;}.inline-block{display:inline-block;}.grid{display:grid;}
.items-start{align-items:flex-start;}.items-center{align-items:center;}.justify-between{justify-content:space-between;}
.flex-col{flex-direction:column;}.flex-wrap{flex-wrap:wrap;}
.gap-0{gap:0;}.gap-0\\.5{gap:2px;}.gap-1{gap:4px;}.gap-2{gap:8px;}.gap-3{gap:10px;}.gap-4{gap:14px;}.gap-5{gap:18px;}.gap-6{gap:20px;}
.grid-cols-1{grid-template-columns:1fr;}.grid-cols-2{grid-template-columns:repeat(2,1fr);}
.col-span-2{grid-column:span 2;}.shrink-0{flex-shrink:0;}
.w-full{width:100%;}.h-12{height:48px;}.w-12{width:48px;}.overflow-hidden{overflow:hidden;}
.space-y-5>*+*{margin-top:18px;}
/* borders & shapes */
.border{border:1px solid;}.border-b{border-bottom:1px solid;}.border-t{border-top:1px solid;}.border-r{border-right:1px solid;}
.rounded-lg{border-radius:8px;}.rounded-xl{border-radius:10px;}.rounded-2xl{border-radius:14px;}.rounded-full{border-radius:9999px;}
.shadow-md{box-shadow:0 4px 6px -1px rgba(0,0,0,.1);}
.divide-y>*+*{border-top:1px solid;}
.last\\:border-0:last-child{border:0;}
/* spacing */
.mt-0\\.5{margin-top:2px;}.mt-1{margin-top:4px;}.mt-2{margin-top:8px;}.mt-3{margin-top:10px;}.mb-2{margin-bottom:8px;}.ml-3{margin-left:10px;}
.px-3{padding-left:10px;padding-right:10px;}.px-4{padding-left:14px;padding-right:14px;}
.px-5{padding-left:18px;padding-right:18px;}.px-6{padding-left:20px;padding-right:20px;}.px-7{padding-left:24px;padding-right:24px;}
.py-1{padding-top:3px;padding-bottom:3px;}.py-1\\.5{padding-top:5px;padding-bottom:5px;}.py-2{padding-top:7px;padding-bottom:7px;}
.py-2\\.5{padding-top:9px;padding-bottom:9px;}.py-3{padding-top:10px;padding-bottom:10px;}.py-5{padding-top:18px;padding-bottom:18px;}
/* typography */
.text-\\[10px\\]{font-size:10px;}.text-xs{font-size:11px;}.text-sm{font-size:12px;}.text-lg{font-size:16px;}.text-xl{font-size:18px;}.text-3xl{font-size:26px;}
.font-medium{font-weight:500;}.font-semibold{font-weight:600;}.font-bold{font-weight:700;}.font-extrabold{font-weight:800;}
.uppercase{text-transform:uppercase;}.capitalize{text-transform:capitalize;}
.tracking-tight{letter-spacing:-.025em;}.tracking-wide{letter-spacing:.05em;}.tracking-widest{letter-spacing:.1em;}
.tracking-\\[0\\.12em\\]{letter-spacing:.12em;}.tracking-\\[0\\.15em\\]{letter-spacing:.15em;}
.leading-snug{line-height:1.35;}.leading-tight{line-height:1.2;}.tabular-nums{font-variant-numeric:tabular-nums;}
.text-center{text-align:center;}.text-right{text-align:right;}.text-left{text-align:left;}
/* colours */
.text-white{color:#fff;}.text-slate-400{color:#94a3b8;}.text-slate-500{color:#64748b;}
.text-slate-600{color:#475569;}.text-slate-700{color:#334155;}.text-slate-800{color:#1e293b;}.text-slate-900{color:#0f172a;}
.text-indigo-200{color:#c7d2fe;}.text-indigo-300{color:#a5b4fc;}.text-indigo-600{color:#4f46e5;}.text-indigo-700{color:#4338ca;}
.text-rose-600{color:#e11d48;}.text-green-200{color:#bbf7d0;}.text-amber-200{color:#fde68a;}
.text-green-600{color:#16a34a;}.text-amber-600{color:#d97706;}.text-orange-600{color:#ea580c;}
.text-violet-600{color:#7c3aed;}.text-sky-700{color:#0369a1;}
.bg-white{background:#fff;}.bg-slate-50{background:#f8fafc;}.bg-slate-100{background:#f1f5f9;}
.bg-rose-50{background:#fff1f2;}.bg-indigo-50{background:#eef2ff;}.bg-sky-50{background:#f0f9ff;}
.border-slate-50{border-color:#f8fafc;}.border-slate-100{border-color:#f1f5f9;}.border-slate-200{border-color:#e2e8f0;}
.border-indigo-100{border-color:#e0e7ff;}.border-sky-100{border-color:#e0f2fe;}
.border-green-400{border-color:#4ade80;}.border-amber-300{border-color:#fcd34d;}
.divide-slate-50>*+*{border-color:#f8fafc;}
`;

function printPayslip(ref) {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const win  = window.open("", "_blank", "width=1100,height=700");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payslip</title><style>${PRINT_CSS}</style></head><body>${html}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
}

/* Main component */
export default function PayslipDetailModal({ open, onClose, payslipId }) {
    const printRef = useRef(null);
    const { data, isLoading } = useGetPayslipQuery(payslipId, { skip: !payslipId });
    const p = data?.data ?? data ?? null;

    const earnings   = p?.lines?.filter((l) => l.category === "earning")   ?? [];
    const deductions = p?.lines?.filter((l) => l.category === "deduction") ?? [];
    const isReleased = p?.status === "released";
    const cutoffLabel = p?.cutoff_type === "second" ? "2nd Cutoff" : "1st Cutoff";

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="min(960px, 95vw)"
            styles={{ body: { padding: 0 } }}
            destroyOnHidden
            title={null}
        >
            {isLoading || !p ? (
                <div className="py-20 text-center text-slate-400 text-sm">Loading payslip\u2026</div>
            ) : (
                <div className="overflow-hidden rounded-xl bg-white" ref={printRef}>

                    {/* HEADER */}
                    <div className="px-5 sm:px-7 py-5 text-white" style={{ background: "linear-gradient(135deg,#4338ca 0%,#3730a3 100%)" }}>
                        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-extrabold text-lg tracking-tight" style={{ background: "rgba(255,255,255,0.15)" }}>
                                    TS
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-200">TimeSync \u00b7 Payslip</p>
                                    <p className="mt-0.5 text-xl font-extrabold leading-tight">{p.user?.name ?? "\u2014"}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                                <MetaField label="Pay Period" value={`${fmtShort(p.period_start)} \u2013 ${fmtShort(p.period_end)}`} />
                                <MetaField label="Pay Date"   value={p.pay_date ? fmtShort(p.pay_date) : "TBD"} />
                                <MetaField label="Cutoff"     value={cutoffLabel} />
                                <div>
                                    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold capitalize ${isReleased ? "border-green-400 text-green-200" : "border-amber-300 text-amber-200"}`}
                                          style={isReleased ? { background: "rgba(34,197,94,.2)" } : { background: "rgba(245,158,11,.2)" }}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BODY — stacks on mobile, two columns on sm+ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2">

                        {/* LEFT: Attendance + Earnings */}
                        <div className="border-b sm:border-b-0 sm:border-r border-slate-100 px-4 sm:px-6 py-5 space-y-5">

                            <div>
                                <SectionHead>Attendance Summary</SectionHead>
                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                    <div className="divide-y divide-slate-50 px-3">
                                        <AttRow label="Days Scheduled" value={`${p.days_scheduled} days`} />
                                        <AttRow label="Days Worked"    value={`${p.days_worked} days`}    cls="text-green-600" />
                                        <AttRow label="Absences"       value={p.days_absent > 0 ? `${p.days_absent} day${p.days_absent !== 1 ? "s" : ""}` : null} cls="text-rose-600" />
                                        <AttRow label="Late"           value={fmtMinutes(p.late_minutes)}       cls="text-amber-600" />
                                        <AttRow label="Undertime"      value={fmtMinutes(p.undertime_minutes)}  cls="text-orange-600" />
                                        <AttRow label="Overtime"       value={fmtMinutes(p.ot_minutes)}         cls="text-indigo-600" />
                                        <AttRow label="Rest Day Work"  value={fmtMinutes(p.rest_day_minutes)}   cls="text-violet-600" />
                                        <AttRow label="Rest Day OT"    value={fmtMinutes(p.rest_day_ot_minutes)}cls="text-violet-600" />
                                    </div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-1">
                                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">Daily Rate</span>
                                        <span className="text-xs font-semibold text-slate-800 tabular-nums">{fmtCurrency(p.daily_rate)}</span>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">Monthly Salary</span>
                                        <span className="text-xs font-semibold text-slate-800 tabular-nums">{fmtCurrency(p.monthly_salary)}</span>
                                    </div>
                                    {p.taxable_income != null && (
                                        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 flex items-center justify-between col-span-2">
                                            <span className="text-[10px] text-slate-500">Taxable Income (semi-monthly)</span>
                                            <span className="text-xs font-semibold text-indigo-700 tabular-nums">{fmtCurrency(p.taxable_income)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <SectionHead>Earnings</SectionHead>
                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                    <div className="divide-y divide-slate-50 px-3">
                                        {earnings.map((l) => (
                                            <LineRow key={l.id} description={l.description} amount={l.amount} />
                                        ))}
                                    </div>
                                </div>
                                <SubRow label="Gross Pay" value={fmtCurrency(p.gross_pay)} />
                            </div>
                        </div>

                        {/* RIGHT: Deductions + Net Pay */}
                        <div className="px-4 sm:px-6 py-5 flex flex-col gap-5">

                            <div>
                                <SectionHead>Deductions</SectionHead>
                                {p.cutoff_type === "first" && (
                                    <div className="mb-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-[10px] text-sky-700 leading-snug">
                                        SSS, PhilHealth, Pag-IBIG and WHT deducted at <strong>half the monthly rate</strong> per cutoff. 2nd cutoff applies cumulative WHT adjustment (TRAIN Law).
                                    </div>
                                )}
                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                    <div className="divide-y divide-slate-50 px-3">
                                        {deductions.length > 0 ? deductions.map((l) => (
                                            <LineRow key={l.id} description={l.description} amount={l.amount} isDeduction />
                                        )) : (
                                            <p className="py-3 text-xs text-slate-400 text-center">No deductions this period.</p>
                                        )}
                                    </div>
                                </div>
                                <SubRow label="Total Deductions" value={`(${fmtCurrency(p.total_deductions)})`} rose />
                            </div>

                            <div className="flex-1" />

                            {/* Net Pay */}
                            <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg,#4338ca 0%,#4f46e5 100%)" }}>
                                <div className="px-6 py-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Net Pay</p>
                                        <p className="text-xs text-indigo-300 mt-0.5">Take-home this period</p>
                                    </div>
                                    <p className="text-3xl font-extrabold text-white tabular-nums">{fmtCurrency(p.net_pay)}</p>
                                </div>
                                {p.released_at && (
                                    <div className="px-6 py-2.5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(99,102,241,.4)", background: "rgba(30,27,75,.2)" }}>
                                        <p className="text-[10px] text-indigo-300 uppercase tracking-wide">Released</p>
                                        <p className="text-xs text-indigo-200 font-medium">{fmtDate(p.released_at?.slice(0, 10))}</p>
                                    </div>
                                )}
                            </div>

                            {/* Print button */}
                            <button
                                onClick={() => printPayslip(printRef)}
                                className="no-print flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                            >
                                <Printer size={15} />
                                Print / Save as PDF
                            </button>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="border-t border-slate-100 bg-slate-50 px-5 sm:px-7 py-3 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-0.5 sm:gap-0">
                        <p className="text-[10px] text-slate-400">This is a computer-generated payslip and does not require a signature.</p>
                        <p className="text-[10px] text-slate-400 tabular-nums shrink-0">
                            Generated by TimeSync \u00b7 {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                    </div>
                </div>
            )}
        </Modal>
    );
}
