import React, { useRef, useState } from 'react';
import { Modal } from 'antd';
import {
    FolderArchive, Search, Upload, Trash2, Download,
    FileText, FileImage, File, Loader2, User, X, Check,
} from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetUsersQuery } from '@/features/users/usersApi';
import {
    useGetAdminUserDocumentsQuery,
    useUploadAdminDocumentMutation,
    useDeleteAdminDocumentMutation,
} from '@/features/admin/adminDocumentsApi';

/* ── Constants ──────────────────────────────────────────────────────── */
export const DOC_TYPES = [
    { value: 'resume',              label: 'Resume / CV' },
    { value: 'application_letter',  label: 'Application Letter' },
    { value: 'police_clearance',    label: 'Police Clearance' },
    { value: 'nbi_clearance',       label: 'NBI Clearance' },
    { value: 'barangay_clearance',  label: 'Barangay Clearance' },
    { value: 'sss',                 label: 'SSS Document / ID' },
    { value: 'pagibig',             label: 'Pag-IBIG Document / ID' },
    { value: 'philhealth',          label: 'PhilHealth Document / ID' },
    { value: 'tin',                 label: 'TIN / BIR Form' },
    { value: 'birth_certificate',   label: 'Birth Certificate' },
    { value: 'diploma',             label: 'Diploma / Transcript' },
    { value: 'medical_certificate', label: 'Medical Certificate' },
    { value: 'employment_contract', label: 'Employment Contract' },
    { value: 'other',               label: 'Other' },
];

const DOC_TYPE_MAP = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

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
function getInitials(name = '') {
    return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

/* ── Upload Modal ───────────────────────────────────────────────────── */
function UploadModal({ open, onClose, user }) {
    const fileRef = useRef(null);
    const [type, setType]       = useState('resume');
    const [file, setFile]       = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError]     = useState('');
    const [uploadDoc, { isLoading }] = useUploadAdminDocumentMutation();

    function reset() {
        setType('resume');
        setFile(null);
        setDragOver(false);
        setError('');
    }

    function handleClose() {
        reset();
        onClose();
    }

    function pickFile(f) {
        if (!f) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!allowed.includes(f.type)) {
            setError('Only PDF, images, and Office documents are allowed.');
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setError('File size must not exceed 10 MB.');
            return;
        }
        setError('');
        setFile(f);
    }

    async function handleUpload() {
        if (!file) { setError('Please select a file.'); return; }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        fd.append('name', file.name);
        try {
            await uploadDoc({ userId: user.id, formData: fd }).unwrap();
            handleClose();
        } catch (err) {
            setError(err?.data?.message ?? 'Upload failed. Please try again.');
        }
    }

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <Upload size={16} className="text-indigo-600" />
                    <span>Upload Document — {user?.name}</span>
                </div>
            }
            footer={null}
            destroyOnHidden
            width={480}
        >
            <div className="mt-4 space-y-4">
                {/* Document type */}
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Document Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    >
                        {DOC_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                    onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors ${
                        dragOver ? 'border-indigo-400 bg-indigo-50' :
                        file    ? 'border-emerald-400 bg-emerald-50' :
                                  'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                >
                    {file ? (
                        <>
                            <Check size={20} className="text-emerald-500" />
                            <p className="text-sm font-medium text-emerald-700 text-center px-4 break-all">{file.name}</p>
                            <p className="text-xs text-slate-400">{fmtBytes(file.size)}</p>
                        </>
                    ) : (
                        <>
                            <Upload size={20} className={dragOver ? 'text-indigo-500' : 'text-slate-300'} />
                            <p className="text-sm text-slate-400">
                                Drag & drop or <span className="text-indigo-600 font-medium">click to browse</span>
                            </p>
                            <p className="text-xs text-slate-300">PDF · Images · Office docs · max 10 MB</p>
                        </>
                    )}
                </div>
                <input ref={fileRef} type="file" className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => pickFile(e.target.files?.[0])} />

                {error && (
                    <p className="flex items-center gap-1.5 text-sm text-rose-600">
                        <X size={13} /> {error}
                    </p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={handleClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleUpload} disabled={isLoading || !file}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {isLoading ? 'Uploading…' : 'Upload'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ── Document Panel (right side) ────────────────────────────────────── */
function DocumentPanel({ user }) {
    const [uploadOpen, setUploadOpen] = useState(false);
    const { data, isLoading } = useGetAdminUserDocumentsQuery(user.id);
    const [deleteDoc, { isLoading: deleting }] = useDeleteAdminDocumentMutation();
    const docs = data?.data ?? [];

    function confirmDelete(doc) {
        Modal.confirm({
            title: 'Delete Document',
            content: `Permanently delete "${doc.name}"?`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: () => deleteDoc({ userId: user.id, documentId: doc.id }),
        });
    }

    return (
        <div className="flex flex-col h-full">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                    <Upload size={14} /> Upload Document
                </button>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <FolderArchive size={36} strokeWidth={1.2} />
                        <p className="text-sm font-semibold text-slate-500">No documents on file</p>
                        <p className="text-xs text-center">Upload this employee's 201 files using the button above.</p>
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
                                            {DOC_TYPE_MAP[doc.type] ?? doc.type} · {fmtBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-PH')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                        <a
                                            href={doc.download_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                                            title="Download"
                                        >
                                            <Download size={12} /> Download
                                        </a>
                                        <button
                                            onClick={() => confirmDelete(doc)}
                                            disabled={deleting}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} user={user} />
        </div>
    );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function AdminDocumentsPage() {
    const [search, setSearch]       = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    const { data, isLoading } = useGetUsersQuery({ per_page: 200 });
    const users = (data?.data ?? []).filter((u) =>
        !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
                   u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Left: User list */}
            <div className="flex w-72 shrink-0 flex-col border-r border-slate-100 bg-white">
                {/* Header */}
                <div className="border-b border-slate-100 px-4 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <FolderArchive size={18} className="text-indigo-600" />
                        <h1 className="text-base font-bold text-slate-800">201 Documents</h1>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search employees…"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto py-2">
                    {isLoading ? (
                        <div className="space-y-1 px-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                            <User size={24} strokeWidth={1.2} />
                            <p className="text-xs">No employees found</p>
                        </div>
                    ) : (
                        users.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                                    selectedUser?.id === u.id ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''
                                }`}
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    selectedUser?.id === u.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {getInitials(u.name)}
                                </div>
                                <div className="min-w-0">
                                    <p className={`truncate text-sm font-medium ${selectedUser?.id === u.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {u.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Document panel */}
            <div className="flex-1 overflow-hidden bg-slate-50">
                {selectedUser ? (
                    <DocumentPanel key={selectedUser.id} user={selectedUser} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                        <FolderArchive size={48} strokeWidth={1} />
                        <p className="text-base font-semibold text-slate-500">Select an employee</p>
                        <p className="text-sm text-center max-w-xs">
                            Choose an employee from the list to view and manage their 201 file documents.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

AdminDocumentsPage.layout = (page) => <MainLayout title="201 Documents">{page}</MainLayout>;
