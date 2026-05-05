import React, { useState } from 'react';
import { Card, Table, Button, Switch, Tag, Modal, Form, Input, InputNumber, Tooltip, Space } from 'antd';
import { PenLine, Trash2, Plus } from 'lucide-react';
import {
    useGetAllowanceTypesQuery,
    useCreateAllowanceTypeMutation,
    useUpdateAllowanceTypeMutation,
    useDeleteAllowanceTypeMutation,
} from '@/features/payroll/payrollApi';

export default function AllowanceTypesSection() {
    const { data, isLoading } = useGetAllowanceTypesQuery({});
    const [createType, { isLoading: creating }] = useCreateAllowanceTypeMutation();
    const [updateType, { isLoading: updating }] = useUpdateAllowanceTypeMutation();
    const [deleteType] = useDeleteAllowanceTypeMutation();

    const [addOpen, setAddOpen]       = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [addForm]  = Form.useForm();
    const [editForm] = Form.useForm();

    const types = data?.data ?? [];

    const handleAdd = async () => {
        const values = await addForm.validateFields();
        await createType(values).unwrap();
        addForm.resetFields();
        setAddOpen(false);
    };

    const handleEdit = async () => {
        const values = await editForm.validateFields();
        await updateType({ id: editRecord.id, ...values }).unwrap();
        setEditRecord(null);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: `Deactivate "${record.name}"?`,
            content: 'This type will be hidden from dropdowns. Existing assignments are kept.',
            okText: 'Deactivate',
            okButtonProps: { danger: true },
            onOk: () => deleteType(record.id),
        });
    };

    const openEdit = (record) => {
        setEditRecord(record);
        editForm.setFieldsValue({
            name:                    record.name,
            code:                    record.code,
            is_taxable:              record.is_taxable,
            monthly_de_minimis_limit: record.monthly_de_minimis_limit ?? undefined,
            description:             record.description ?? '',
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render: (name, record) => (
                <Space>
                    <span>{name}</span>
                    {record.is_taxable
                        ? <Tag color="orange">Taxable</Tag>
                        : record.monthly_de_minimis_limit
                            ? <Tag color="green">De minimis ₱{Number(record.monthly_de_minimis_limit).toLocaleString()}/mo</Tag>
                            : <Tag color="green">Non-taxable</Tag>
                    }
                    {!record.is_active && <Tag color="default">Inactive</Tag>}
                </Space>
            ),
        },
        { title: 'Code', dataIndex: 'code', render: (c) => <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{c}</code> },
        {
            title: 'Actions',
            width: 100,
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

    const typeFormFields = (form) => (
        <>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
            <Form.Item
                name="code"
                label="Code"
                rules={[{ required: true }, { pattern: /^[A-Z0-9_]+$/, message: 'Uppercase letters, digits, underscores only' }]}
            >
                <Input placeholder="e.g. RICE_SUBSIDY" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
            <Form.Item name="is_taxable" label="Taxable?" valuePropName="checked" initialValue={false}>
                <Switch />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.is_taxable !== cur.is_taxable}>
                {({ getFieldValue }) =>
                    !getFieldValue('is_taxable') && (
                        <Form.Item name="monthly_de_minimis_limit" label="Monthly De Minimis Ceiling (₱)" tooltip="BIR non-taxable monthly cap; leave blank if none">
                            <InputNumber min={0} step={100} style={{ width: '100%' }} />
                        </Form.Item>
                    )
                }
            </Form.Item>
            <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} />
            </Form.Item>
        </>
    );

    return (
        <>
            <Card
                title="Allowance Types"
                extra={
                    <Button type="primary" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                        Add Type
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

            <Modal
                title="New Allowance Type"
                open={addOpen}
                onOk={handleAdd}
                onCancel={() => { setAddOpen(false); addForm.resetFields(); }}
                confirmLoading={creating}
                destroyOnHidden
            >
                <Form form={addForm} layout="vertical" className="mt-4">
                    {typeFormFields(addForm)}
                </Form>
            </Modal>

            <Modal
                title="Edit Allowance Type"
                open={!!editRecord}
                onOk={handleEdit}
                onCancel={() => setEditRecord(null)}
                confirmLoading={updating}
                destroyOnHidden
            >
                <Form form={editForm} layout="vertical" className="mt-4">
                    {typeFormFields(editForm)}
                </Form>
            </Modal>
        </>
    );
}
