import React, { useRef, useState } from 'react';
import { Camera, Loader2, Pencil } from 'lucide-react';
import { useUploadAvatarMutation } from '@/features/user/userApi';

export default function ProfileHeader({ profile, onEditClick }) {
    const fileRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();

    const name = profile?.name ?? '—';
    const email = profile?.email ?? '';
    const pct = profile?.completion_percentage ?? 0;
    const missing = profile?.completion_missing ?? [];

    const avatarSrc = preview ?? profile?.avatar_url ?? null;
    const initials = ((profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '')).toUpperCase() || '?';

    async function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        try {
            await uploadAvatar(file).unwrap();
        } catch {
            setPreview(null);
        }
        e.target.value = '';
    }

    return (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            {/* Banner */}
            <div
                className="h-32 relative"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}
            >
                {/* Edit Profile button */}
                <button
                    onClick={onEditClick}
                    className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition"
                >
                    <Pencil size={13} />
                    Edit Profile
                </button>
            </div>

            {/* Avatar row */}
            <div className="bg-white px-6 pb-5">
                <div className="flex items-end gap-4 -mt-12 mb-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white bg-indigo-100 shadow">
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-indigo-600">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-60 transition"
                            aria-label="Change profile picture"
                        >
                            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </div>

                    {/* Name + email */}
                    <div className="pb-1 min-w-0">
                        <p className="text-lg font-bold text-slate-900 truncate">{name}</p>
                        <p className="text-sm text-slate-500 truncate">{email}</p>
                    </div>
                </div>

                {/* Completion bar — hidden when 100% */}
                {pct < 100 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-amber-800">Complete Your Profile</p>
                            <span className="text-xs font-bold text-amber-700">{pct}%</span>
                        </div>
                        {missing.length > 0 && (
                            <p className="text-xs text-amber-700 mb-2">
                                Fill in your {missing.slice(0, 3).join(', ')}
                                {missing.length > 3 ? ` and ${missing.length - 3} more` : ''} to complete your profile.
                            </p>
                        )}
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-amber-200 overflow-hidden">
                            <div
                                className="h-2 rounded-full bg-amber-400 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="mt-1.5 text-[10px] text-amber-600">
                            💡 Tip: A complete profile helps your HR team serve you better.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
