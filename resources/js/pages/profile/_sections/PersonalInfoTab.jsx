import React from 'react';
import { User, Phone, MapPin, ShieldAlert, CreditCard } from 'lucide-react';

const GENDER_LABELS = {
    male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say',
};
const MARITAL_LABELS = {
    single: 'Single', married: 'Married', widowed: 'Widowed',
    separated: 'Separated', divorced: 'Divorced',
};

function Section({ title, icon: Icon, color, children }) {
    return (
        <div className={`rounded-xl border p-5 ${color}`}>
            <div className="flex items-center gap-2 mb-4">
                <Icon size={15} className="shrink-0" />
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {children}
            </div>
        </div>
    );
}

function Field({ label, value, required }) {
    const empty = value == null || value === '';
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                {label}{required && ' *'}
            </p>
            {empty ? (
                <p className="flex items-center gap-1.5 text-sm text-slate-300">
                    <span className="text-slate-300">—</span>
                    <span className="text-xs italic text-slate-300">Not provided</span>
                </p>
            ) : (
                <p className="text-sm font-medium text-slate-700">{value}</p>
            )}
        </div>
    );
}

export default function PersonalInfoTab({ profile }) {
    if (!profile) return null;

    const fullName = [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
        .filter(Boolean).join(' ');

    return (
        <div className="space-y-4">
            {/* Basic Information */}
            <Section
                title="Basic Information"
                icon={User}
                color="border-blue-100 bg-blue-50/40 text-blue-800"
            >
                <Field label="First Name"   value={profile.first_name}  required />
                <Field label="Middle Name"  value={profile.middle_name} />
                <Field label="Last Name"    value={profile.last_name}   required />
                <Field label="Suffix"       value={profile.suffix} />
                <Field label="Date of Birth" value={
                    profile.date_of_birth
                        ? new Date(profile.date_of_birth + 'T00:00:00').toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : null
                } />
                <Field label="Gender"        value={GENDER_LABELS[profile.gender] ?? null} />
                <Field label="Nationality"   value={profile.nationality} />
                <Field label="Marital Status" value={MARITAL_LABELS[profile.marital_status] ?? null} />
            </Section>

            {/* Contact Information */}
            <Section
                title="Contact Information"
                icon={Phone}
                color="border-emerald-100 bg-emerald-50/40 text-emerald-800"
            >
                <Field label="Email Address" value={profile.email} required />
                <Field label="Phone Number"  value={profile.phone_number} required />
            </Section>

            {/* Address Information */}
            <Section
                title="Address Information"
                icon={MapPin}
                color="border-rose-100 bg-rose-50/30 text-rose-800"
            >
                <Field label="Street Address"    value={profile.street_address} />
                <Field label="Barangay"          value={profile.barangay} />
                <Field label="City/Municipality" value={profile.city} />
                <Field label="Province"          value={profile.province} />
                <Field label="Zip Code"          value={profile.zip_code} />
                <Field label="Country"           value={profile.country} />
            </Section>

            {/* Emergency Contact */}
            <Section
                title="Emergency Contact Information"
                icon={ShieldAlert}
                color="border-orange-100 bg-orange-50/30 text-orange-800"
            >
                <Field label="Contact Person Full Name" value={profile.emergency_contact_name} />
                <Field label="Emergency Contact Number" value={profile.emergency_contact_number} />
                <Field label="Relationship"             value={profile.emergency_contact_relationship} />
            </Section>

            {/* Philippine Government IDs */}
            <Section
                title="Philippine Government IDs"
                icon={CreditCard}
                color="border-amber-100 bg-amber-50/30 text-amber-800"
            >
                <Field label="SSS Number"       value={profile.sss_number} />
                <Field label="Pag-IBIG Number"  value={profile.pagibig_number} />
                <Field label="PhilHealth Number" value={profile.philhealth_number} />
                <Field label="TIN Number"       value={profile.tin_number} />
            </Section>
        </div>
    );
}
