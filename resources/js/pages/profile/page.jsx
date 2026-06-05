import React, { useState } from 'react';
import { User, CalendarCheck, FileText, Settings, Loader2 } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';
import { useGetMyProfileQuery } from '@/features/profile/profileApi';

import ProfileHeader       from './_sections/ProfileHeader';
import PersonalInfoTab     from './_sections/PersonalInfoTab';
import LeaveCreditsTab     from './_sections/ExperiencesTab';   // renamed internally
import DocumentsTab        from './_sections/DocumentsTab';
import AccountSettingsTab  from './_sections/CustomizationTab'; // renamed internally
import EditProfileModal    from './_sections/EditProfileModal';

/* ── Tab definitions ──────────────────────────────────────────────── */
const TABS = [
    { key: 'personal',  label: 'Personal Info',    icon: User          },
    { key: 'leave',     label: 'Leave Credits',    icon: CalendarCheck },
    { key: 'documents', label: 'Documents',        icon: FileText      },
    { key: 'settings',  label: 'Account Settings', icon: Settings      },
];

export default function ProfilePage() {
    const { data: profileData, isLoading } = useGetMyProfileQuery();
    const [activeTab, setActiveTab]        = useState('personal');
    const [editOpen, setEditOpen]          = useState(false);

    const profile = profileData?.data ?? profileData ?? null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-5 pb-10">
            {/* Profile header with avatar, name, completion bar */}
            <ProfileHeader
                profile={profile}
                onEditClick={() => setEditOpen(true)}
            />

            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                            activeTab === key
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                    >
                        <Icon size={15} strokeWidth={2} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm min-h-[300px]">
                {activeTab === 'personal'  && <PersonalInfoTab   profile={profile} />}
                {activeTab === 'leave'     && <LeaveCreditsTab />}
                {activeTab === 'documents' && <DocumentsTab />}
                {activeTab === 'settings'  && <AccountSettingsTab />}
            </div>

            {/* Edit profile modal */}
            <EditProfileModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                profile={profile}
            />
        </div>
    );
}

ProfilePage.layout = (page) => <MainLayout>{page}</MainLayout>;
