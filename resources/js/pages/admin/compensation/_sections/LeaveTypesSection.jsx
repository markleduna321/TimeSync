import React, { useState } from 'react';
import { Card, Table, Button, Switch, Tag, Modal, Form, Input, InputNumber, Select, Tooltip, Space } from 'antd';
import { PenLine, Trash2, Plus } from 'lucide-react';
import {
    useGetLeaveTypesQuery,
    useCreateLeaveTypeMutation,
    useUpdateLeaveTypeMutation,
    useDeleteLeaveTypeMutation,
} from '@/features/leave/leaveApi';

const DEFAULT_COLORS = ['#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899'];

const ALLOCATION_LABELS = {
    monthly_accrual: 'Monthly Accrual',
    annual_lump:     'Annual Lump Sum',
    manual:          'Manual',
};

export default function LeaveTypesSection() {
    const { data, isLoading } = useGetLeaveTypesQuery({});
    const [createType, { isLoading: creating }] = useCreateLeaveTypeMutation();
    const [updateType, { isLoading: updating }] = useUpdateLeaveTypeMutation();
    const [deleteType]                          = useDeleteLeaveTypeMutation();

    const [addOpen,    setAddOpen]    = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [addForm]  = Form.useForm();
    const [editForm] = Form.useForm();

    const types = data?.data ?? [];

    const handleAdd = async () => {
        const values = await addForm.validateFields();
        const payload = buildPayload(values);
        await createType(payload).unwrap();
        addForm.resetFields();
        setAddOpen(false);
    };

    const handleEdit = async () => {
        const values = await editForm.validateFields();
        const payload = buildPayload(values);
        await updateType({ id: editRecord.id, ...payload }).unwrap();
        setEditRecord(null);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: `Deactivate "${record.name}"?`,
            content: 'This leave type will be hidden from dropdowns. Existing applications and credits are kept.',
            okText: 'Deactivate',
            okButtonProps: { danger: true },
            onOk: () => deleteType(record.id),
        });
    };

    const openEdit = (record) => {
        setEditRecord(record);
        const p = record.policy;
        editForm.setFieldsValue({
            name:                      record.name,
            code:                      record.code,
            color:                     record.color,
            min_advance_days:          record.min_advance_days ?? 0,
            max_consecutive_days:      record.max_consecutive_days ?? null,
            requires_proof_above_days: record.requires_proof_above_days ?? null,
            is_paid:                   record.is_paid ?? true,
            is_active:                 record.is_active ?? true,
            is_monetizable:            record.is_monetizable ?? false,
            policy_type:               p?.allocation_type ?? '',
            monthly_rate:              p?.monthly_rate ?? null,
            annual_amount:             p?.annual_amount ?? null,
        });
    };

    function buildPayload(values) {
        const payload = {
            name:                      values.name,
            code:                      (values.code ?? '').toUpperCase(),
            color:                     values.color ?? DEFAULT_COLORS[0],
            min_advance_days:          values.min_advance_days ?? 0,
            max_consecutive_days:      values.max_consecutive_days ?? null,
            requires_proof_above_days: values.requires_proof_above_days ?? null,
            is_paid:                   values.is_paid ?? true,
            is_active:                 values.is_active ?? true,
            is_monetizable:            values.is_monetizable ?? false,
        };
        if (values.policy_type) {
            payload.policy = {
                allocation_type: values.policy_type,
                monthly_rate:    values.policy_type === 'monthly_accrual' ? values.monthly_rate : null,
                annual_amount:   values.policy_type === 'annual_lump'     ? values.annual_amount : null,
                is_active:       true,
            };
        }
        return payload;
    }

    const columns = [
        {
            title: 'Leave Type',
            dataIndex: 'name',
            render: (name, record) => (
                <Space wrap>
                    <span
                        style={{ backgroundColor: record.color }}
                        className="inline-block h-2.5 w-2.5 rounded-full"
                    />
                    <span className="font-medium">{name}</span>
                    {record.is_paid        && <Tag color="green">Paid</Tag>}
                    {record.is_monetizable && <Tag color="gold">Monetizable</Tag>}
                    {!record.is_active     && <Tag color="default">Inactive</Tag>}
                </Space>
            ),
        },
        {
            title: 'Code',
            dataIndex: 'code',
            width: 80,
            render: (c) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{c}</code>,
        },
        {
            title: 'Credit Policy',
            dataIndex: 'policy',
            width: 160,
            render: (p) => p
                ? <Tag>{ALLOCATION_LABELS[p.allocation_type] ?? p.allocation_type}</Tag>
                : <span className="text-slate-400 text-xs">None</span>,
        },
        {
            title: 'Actions',
            width: 90,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button size="small" icon={<PenLine size={13} />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Deactivate">
                        <Button size="small" danger icon={<Trash2 size={13} />} onClick={() => handleDelete(record)} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const formFields = (form) => (
        <>
            <div className="grid grid-cols-2 gap-x-4">
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Vacation Leave" />
                </Form.Item>
                <Form.Item
                    name="code"
                    label="Code"
                    rules={[{ required: true }, { max: 10 }]}
                    normalize={(v) => v?.toUpperCase()}
                >
                    <Input placeholder="VL" />
                </Form.Item>
            </div>

            <Form.Item name="color" label="Color" initialValue={DEFAULT_COLORS[0]}>
                <div className="flex items-center gap-2 flex-wrap">
                    {DEFAULT_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => form.setFieldValue('color', c)}
                            style={{ backgroundColor: c }}
                            className={[
                                'h-6 w-6 rounded-full border-2 transition-transform',
                                form.getFieldValue('color') === c
                                    ? 'scale-125 border-slate-600'
                                    : 'border-transparent hover:scale-110',
                            ].join(' ')}
                        />
                    ))}
                    <Form.Item noStyle name="color">
                        <input
                            type="color"
                            className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0.5"
                            title="Custom color"
                        />
                    </Form.Item>
                </div>
            </Form.Item>

            <div className="grid grid-cols-3 gap-x-4">
                <Form.Item name="min_advance_days" label="Min Advance Days" initialValue={0}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="max_consecutive_days" label="Max Consecutive">
                    <InputNumber min={1} placeholder="∞" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="requires_proof_above_days" label="Proof Above (days)">
                    <InputNumber min={1} placeholder="—" style={{ width: '100%' }} />
                </Form.Item>
            </div>

            <div className="flex gap-8">
                <Form.Item name="is_paid" label="Paid Leave" valuePropName="checked" initialValue={true}>
                    <Switch />
                </Form.Item>
                <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
                    <Switch />
                </Form.Item>
                <Form.Item name="is_monetizable" label="Monetizable" valuePropName="checked" initialValue={false}>
                    <Switch />
                </Form.Item>
            </div>

            <Form.Item name="policy_type" label="Credit Policy">
                <Select allowClear placeholder="No automatic credits">
                    <Select.Option value="monthly_accrual">Monthly Accrual</Select.Option>
                    <Select.Option value="annual_lump">Annual Lump Sum</Select.Option>
                    <Select.Option value="manual">Manual only</Select.Option>
                </Select>
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.policy_type !== cur.policy_type}>
                {({ getFieldValue }) => {
                    const pt = getFieldValue('policy_type');
                    if (pt === 'monthly_accrual') return (
                        <Form.Item name="monthly_rate" label="Monthly Rate (days)" rules={[{ required: true }]}>
                            <InputNumber min={0.01} step={0.5} style={{ width: '100%' }} />
                        </Form.Item>
                    );
                    if (pt === 'annual_lump') return (
                        <Form.Item name="annual_amount" label="Annual Amount (days)" rules={[{ required: true }]}>
                            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
                        </Form.Item>
                    );
                    return null;
                }}
            </Form.Item>
        </>
    );

    return (
        <>
            <Card
                title="Leave Types"
                extra={
                    <Button type="primary" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                        Add Leave Type
                    </Button>
                }
                className="h-full"
            >
                <Table
                    rowKey="id"
                    dataSource={types}
                    columns={columns}
                    loading={isLoading}
                    pagination={false}
                    size="small"
                />
            </Card>

            {/* Add modal */}
            <Modal
                title="New Leave Type"
                open={addOpen}
                onOk={handleAdd}
                onCancel={() => { setAddOpen(false); addForm.resetFields(); }}
                confirmLoading={creating}
                width={520}
                destroyOnHidden
            >
                <Form form={addForm} layout="vertical" className="mt-4">
                    {formFields(addForm)}
                </Form>
            </Modal>

            {/* Edit modal */}
            <Modal
                title="Edit Leave Type"
                open={!!editRecord}
                onOk={handleEdit}
                onCancel={() => setEditRecord(null)}
                confirmLoading={updating}
                width={520}
                destroyOnHidden
            >
                <Form form={editForm} layout="vertical" className="mt-4">
                    {formFields(editForm)}
                </Form>
            </Modal>
        </>
    );
}
