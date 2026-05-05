import React, { useState } from 'react';
import { Card, Table, Button, Switch, Tag, Modal, Form, Input, Tooltip, Typography, Space } from 'antd';
import { PenLine, Trash2, Plus, Building2 } from 'lucide-react';
import {
    useGetDeductionTypesQuery,
    useCreateDeductionTypeMutation,
    useUpdateDeductionTypeMutation,
    useDeleteDeductionTypeMutation,
} from '@/features/payroll/payrollApi';

const { Text } = Typography;

export default function DeductionTypesSection() {
    const { data, isLoading } = useGetDeductionTypesQuery({});
    const [createType, { isLoading: creating }] = useCreateDeductionTypeMutation();
    const [updateType, { isLoading: updating }] = useUpdateDeductionTypeMutation();
    const [deleteType] = useDeleteDeductionTypeMutation();

    const [addOpen, setAddOpen]     = useState(false);
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
            content: 'This type will be hidden from dropdowns but existing assignments will not be removed.',
            okText: 'Deactivate',
            okButtonProps: { danger: true },
            onOk: () => deleteType(record.id),
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render: (name, record) => (
                <Space>
                    {record.is_government && (
                        <Tooltip title="Government / system-managed">
                            <Building2 size={14} className="text-blue-500" />
                        </Tooltip>
                    )}
                    <span>{name}</span>
                    {!record.is_active && <Tag color="default">Inactive</Tag>}
                </Space>
            ),
        },
        { title: 'Code', dataIndex: 'code', render: (c) => <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{c}</code> },
        {
            title: 'Actions',
            width: 100,
            render: (_, record) => {
                if (record.is_government) return null;
                return (
                    <Space>
                        <Tooltip title="Edit">
                            <Button
                                size="small"
                                icon={<PenLine size={13} />}
                                onClick={() => { setEditRecord(record); editForm.setFieldsValue({ name: record.name, code: record.code }); }}
                            />
                        </Tooltip>
                        <Tooltip title="Deactivate">
                            <Button
                                size="small"
                                danger
                                icon={<Trash2 size={13} />}
                                onClick={() => handleDelete(record)}
                            />
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    return (
        <>
            <Card
                title="Deduction Types"
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

            {/* Add modal */}
            <Modal
                title="New Deduction Type"
                open={addOpen}
                onOk={handleAdd}
                onCancel={() => { setAddOpen(false); addForm.resetFields(); }}
                confirmLoading={creating}
                destroyOnHidden
            >
                <Form form={addForm} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Code"
                        rules={[{ required: true }, { pattern: /^[A-Z0-9_]+$/, message: 'Uppercase letters, digits, underscores only' }]}
                    >
                        <Input placeholder="e.g. EQUIPMENT_LOAN" style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit modal */}
            <Modal
                title="Edit Deduction Type"
                open={!!editRecord}
                onOk={handleEdit}
                onCancel={() => setEditRecord(null)}
                confirmLoading={updating}
                destroyOnHidden
            >
                <Form form={editForm} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Code"
                        rules={[{ required: true }, { pattern: /^[A-Z0-9_]+$/, message: 'Uppercase letters, digits, underscores only' }]}
                    >
                        <Input style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
