import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Loader2 } from 'lucide-react';
import { useUpdateMyProfileMutation } from '@/features/profile/profileApi';

const inputCls = (err) =>
    `block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
        err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-indigo-500'
    }`;

function SectionHead({ children }) {
    return (
        <p className="mt-5 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
            {children}
        </p>
    );
}

function Field({ label, children, error, required }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-rose-600">{error[0]}</p>}
        </div>
    );
}

const GENDER_OPTIONS   = ['male', 'female', 'other', 'prefer_not_to_say'];
const GENDER_LABELS    = { male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say' };
const MARITAL_OPTIONS  = ['single', 'married', 'widowed', 'separated', 'divorced'];

const EMPTY_FORM = {
    suffix: '', date_of_birth: '', gender: '', nationality: 'Filipino', marital_status: '',
    phone_number: '',
    street_address: '', barangay: '', city: '', province: '', zip_code: '', country: 'Philippines',
    emergency_contact_name: '', emergency_contact_number: '', emergency_contact_relationship: '',
    sss_number: '', pagibig_number: '', philhealth_number: '', tin_number: '',
};

export default function EditProfileModal({ open, onClose, profile }) {
    const [form, setForm]     = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [updateMyProfile, { isLoading }] = useUpdateMyProfileMutation();

    // Populate form when modal opens
    useEffect(() => {
        if (open && profile) {
            setForm({
                suffix:           profile.suffix           ?? '',
                date_of_birth:    profile.date_of_birth    ?? '',
                gender:           profile.gender           ?? '',
                nationality:      profile.nationality      ?? 'Filipino',
                marital_status:   profile.marital_status   ?? '',
                phone_number:     profile.phone_number     ?? '',
                street_address:   profile.street_address   ?? '',
                barangay:         profile.barangay         ?? '',
                city:             profile.city             ?? '',
                province:         profile.province         ?? '',
                zip_code:         profile.zip_code         ?? '',
                country:          profile.country          ?? 'Philippines',
                emergency_contact_name:         profile.emergency_contact_name         ?? '',
                emergency_contact_number:       profile.emergency_contact_number       ?? '',
                emergency_contact_relationship: profile.emergency_contact_relationship ?? '',
                sss_number:       profile.sss_number       ?? '',
                pagibig_number:   profile.pagibig_number   ?? '',
                philhealth_number:profile.philhealth_number?? '',
                tin_number:       profile.tin_number       ?? '',
            });
            setErrors({});
        }
    }, [open, profile]);

    function set(field, val) {
        setForm((f) => ({ ...f, [field]: val }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    }

    async function handleSubmit() {
        setErrors({});
        try {
            await updateMyProfile(form).unwrap();
            onClose();
        } catch (err) {
            if (err?.status === 422) setErrors(err.data?.errors ?? {});
        }
    }

    const txt = (field, label, opts = {}) => (
        <Field label={label} error={errors[field]} required={opts.required}>
            <input
                type={opts.type ?? 'text'}
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                className={inputCls(errors[field])}
                placeholder={opts.placeholder ?? ''}
            />
        </Field>
    );

    const sel = (field, label, options, labelMap) => (
        <Field label={label} error={errors[field]}>
            <select
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                className={inputCls(errors[field])}
            >
                <option value="">— Select —</option>
                {options.map((o) => (
                    <option key={o} value={o}>{labelMap ? labelMap[o] : o}</option>
                ))}
            </select>
        </Field>
    );

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={<span className="text-slate-800 font-semibold">Edit Profile</span>}
            width="min(720px, 95vw)"
            footer={
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                    >
                        {isLoading && <Loader2 size={14} className="animate-spin" />}
                        {isLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            }
            destroyOnHidden
        >
            <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-0">

                <SectionHead>Basic Information</SectionHead>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {txt('suffix',       'Suffix', { placeholder: 'Jr., Sr., III…' })}
                    {txt('date_of_birth','Date of Birth', { type: 'date' })}
                    {sel('gender',       'Gender',         GENDER_OPTIONS,  GENDER_LABELS)}
                    {txt('nationality',  'Nationality',    { placeholder: 'e.g. Filipino' })}
                    {sel('marital_status','Marital Status', MARITAL_OPTIONS, null)}
                </div>

                <SectionHead>Contact Information</SectionHead>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {txt('phone_number', 'Phone Number', { required: true, placeholder: '+63 9XX XXX XXXX' })}
                </div>

                <SectionHead>Address</SectionHead>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {txt('street_address', 'Street Address')}
                    {txt('barangay',       'Barangay')}
                    {txt('city',           'City / Municipality')}
                    {txt('province',       'Province')}
                    {txt('zip_code',       'Zip Code')}
                    {txt('country',        'Country')}
                </div>

                <SectionHead>Emergency Contact</SectionHead>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {txt('emergency_contact_name',         'Contact Person Full Name')}
                    {txt('emergency_contact_number',       'Emergency Contact Number')}
                    {txt('emergency_contact_relationship', 'Relationship', { placeholder: 'e.g. Spouse, Parent' })}
                </div>

                <SectionHead>Philippine Government IDs</SectionHead>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {txt('sss_number',        'SSS Number')}
                    {txt('pagibig_number',    'Pag-IBIG Number')}
                    {txt('philhealth_number', 'PhilHealth Number')}
                    {txt('tin_number',        'TIN Number')}
                </div>
            </div>
        </Modal>
    );
}
