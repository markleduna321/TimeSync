import React, { useEffect, useState } from 'react';
import { Modal, Select } from 'antd';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/features/teams/teamsApi';

const DEFAULT_FORM = { name: '', description: '', leader_id: null, manager_id: null, member_ids: [] };

export default function TeamFormModal({ open, onClose, editingTeam, teamLeadUsers, managerUsers, allUsers, isManagerMode }) {
    const [form, setForm]     = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});

    const [createTeam, { isLoading: creating }] = useCreateTeamMutation();
    const [updateTeam, { isLoading: updating }] = useUpdateTeamMutation();
    const isLoading = creating || updating;

    /* Pre-fill form when editing */
    useEffect(() => {
        if (editingTeam) {
            setForm({
                name:        editingTeam.name        ?? '',
                description: editingTeam.description ?? '',
                leader_id:   editingTeam.leader_id   ?? null,
                manager_id:  editingTeam.manager_id  ?? null,
                member_ids:  editingTeam.members?.map((m) => m.id) ?? [],
            });
        } else {
            setForm(DEFAULT_FORM);
        }
        setErrors({});
    }, [editingTeam, open]);

    function set(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    const teamLeadOptions = (teamLeadUsers ?? []).map((u) => ({ value: u.id, label: u.name }));
    const managerOptions  = (managerUsers  ?? []).map((u) => ({ value: u.id, label: u.name }));
    const allUserOptions  = (allUsers      ?? []).map((u) => ({ value: u.id, label: u.name }));

    async function handleSubmit() {
        setErrors({});
        try {
            if (editingTeam) {
                await updateTeam({ id: editingTeam.id, ...form }).unwrap();
            } else {
                await createTeam(form).unwrap();
            }
            onClose();
        } catch (err) {
            if (err?.status === 422) {
                setErrors(err.data?.errors ?? {});
            }
        }
    }

    return (
        <Modal
            open={open}
            title={<span className="font-semibold text-slate-800">{editingTeam ? (isManagerMode ? `Manage: ${editingTeam.name}` : 'Edit Team') : 'New Team'}</span>}
            onCancel={onClose}
            onOk={handleSubmit}
            okText={editingTeam ? 'Save Changes' : 'Create Team'}
            okButtonProps={{ loading: isLoading, className: 'bg-indigo-600 hover:bg-indigo-700' }}
            cancelButtonProps={{ disabled: isLoading }}
            destroyOnHidden
        >
            <div className="mt-4 space-y-4">
                {/* Name — hidden for manager mode */}
                {!isManagerMode && (
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="t-name">
                        Team Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="t-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        placeholder="Engineering Alpha"
                        disabled={isLoading}
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name[0]}</p>}
                </div>
                )}

                {/* Description — hidden for manager mode */}
                {!isManagerMode && (
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="t-desc">
                        Description
                    </label>
                    <textarea
                        id="t-desc"
                        rows={2}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Optional description…"
                        disabled={isLoading}
                    />
                    {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description[0]}</p>}
                </div>
                )}

                {/* Team Lead — only users with team_lead role */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="t-leader">
                        Team Lead
                    </label>
                    {teamLeadOptions.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-400">No users with the Team Lead role yet.</p>
                    ) : (
                        <Select
                            id="t-leader"
                            className="mt-1 w-full"
                            placeholder="Select a team lead…"
                            value={form.leader_id}
                            onChange={(val) => set('leader_id', val ?? null)}
                            options={teamLeadOptions}
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            disabled={isLoading}
                        />
                    )}
                    {errors.leader_id && <p className="mt-1 text-xs text-rose-600">{errors.leader_id[0]}</p>}
                </div>

                {/* Manager — hidden for manager mode */}
                {!isManagerMode && (
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="t-manager">
                        Manager
                        <span className="ml-1 font-normal text-slate-400">(approves team lead requests)</span>
                    </label>
                    {managerOptions.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-400">No users with the Manager role yet.</p>
                    ) : (
                        <Select
                            id="t-manager"
                            className="mt-1 w-full"
                            placeholder="Select a manager…"
                            value={form.manager_id}
                            onChange={(val) => set('manager_id', val ?? null)}
                            options={managerOptions}
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            disabled={isLoading}
                        />
                    )}
                    {errors.manager_id && <p className="mt-1 text-xs text-rose-600">{errors.manager_id[0]}</p>}
                </div>
                )}

                {/* Members — all users */}
                <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="t-members">
                        Members
                    </label>
                    <Select
                        id="t-members"
                        mode="multiple"
                        className="mt-1 w-full"
                        placeholder="Select team members…"
                        value={form.member_ids}
                        onChange={(val) => set('member_ids', val)}
                        options={allUserOptions}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        disabled={isLoading}
                        maxTagCount="responsive"
                    />
                    {errors.member_ids && <p className="mt-1 text-xs text-rose-600">{errors.member_ids[0]}</p>}
                </div>
            </div>
        </Modal>
    );
}
