// Documents are managed by HR/Admin only.
// This tab is READ-ONLY for employees — no upload controls.
import React from 'react';
import { FileText, Download, FileImage, File, ShieldCheck } from 'lucide-react';
import { useGetMyDocumentsQuery } from '@/features/profile/profileApi';

const DOC_TYPE_LABELS = {
    resume:               'Resume / CV',
    application_letter:   'Application Letter',
    police_clearance:     'Police Clearance',
    nbi_clearance:        'NBI Clearance',
    barangay_clearance:   'Barangay Clearance',
    sss:                  'SSS Document / ID',
    pagibig:              'Pag-IBIG Document / ID',
    philhealth:           'PhilHealth Document / ID',
    tin:                  'TIN / BIR Form',
    birth_certificate:    'Birth Certificate',
    diploma:              'Diploma / Transcript',
    medical_certificate:  'Medical Certificate',
    employment_contract:  'Employment Contract',
    // legacy keys kept for backward compat
    sss_id:               'SSS ID',
    philhealth_id:        'PhilHealth ID',
    pagibig_id:           'Pag-IBIG ID',
    tin_id:               'TIN ID',
    other:                'Other',
};

function fmtBytes(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function docIcon(mime) {
    if (!mime) return File;
    if (mime.startsWith('image/')) return FileImage;
    return FileText;
}

export default function DocumentsTab() {
    const { data, isLoading } = useGetMyDocumentsQuery();
    const docs = data?.data ?? [];

    if (isLoading) return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Info banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <ShieldCheck size={15} className="text-sky-600 mt-0.5 shrink-0" />
                <p className="text-xs text-sky-700 leading-snug">
                    Documents are managed by your HR administrator. Contact HR to add, update, or remove your 201 files.
                </p>
            </div>

            {docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-slate-400">
                    <FileText size={32} strokeWidth={1.2} />
                    <p className="text-sm font-medium">No documents on file</p>
                    <p className="text-xs text-center max-w-xs">Your HR admin hasn't uploaded any documents for you yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {docs.map((doc) => {
                        const Icon = docIcon(doc.mime_type);
                        return (
                            <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-slate-200 transition group">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                                    <p className="text-xs text-slate-400">
                                        {DOC_TYPE_LABELS[doc.type] ?? doc.type} · {fmtBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-PH')}
                                    </p>
                                </div>
                                <a
                                    href={doc.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                                    title="Download"
                                >
                                    <Download size={12} /> Download
                                </a>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
