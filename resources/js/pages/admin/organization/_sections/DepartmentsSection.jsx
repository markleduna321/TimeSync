import React, { useState } from 'react';
import { Card, Table, Button, Tag, Modal, Form, Input, Tooltip, Space } from 'antd';
import { PenLine, Trash2, Plus } from 'lucide-react';
import {
    useGetDepartmentsQuery,
    useCreateDepartmentMutation,
    useUpdateDepartmentMutation,
    useDeleteDepartmentMutation,
} from '@/features/organization/organizationApi';

export default function DepartmentsSection() {
    const { data, isLoading } = useGetDepartmentsQuery({});
    const [createDepartment, { isLoading: creating }] = useCreateDepartmentMutation();
    const [updateDepartment, { isLoading: updating }] = useUpdateDepartmentMutation();
    const [deleteDepartment] = useDeleteDepartmentMutation();

    const [addOpen, setAddOpen]       = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [addForm]  = Form.useForm();
    const [editForm] = Form.useForm();

    const departments = data?.data ?? [];

    const handleAdd = async () => {
        const values = await addForm.validateFields();
        await createDepartment(values).unwrap();
        addForm.resetFields();
        setAddOpen(false);
    };

    const handleEdit = async () => {
        const values = await editForm.validateFields();
        await updateDepartment({ id: editRecord.id, ...values }).unwrap();
        setEditRecord(null);
    };

    const handleDeactivate = (record) => {
        Modal.confirm({
            title: `Deactivate "${record.name}"?`,
            content: 'This department will be hidden from dropdowns. Existing user assignments are not removed.',
            okText: 'Deactivate',
            okButtonProps: { danger: true },
            onOk: () => deleteDepartment(record.id),
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render: (name, record) => (
                <Space>
                    <span>{name}</span>
                    {!record.is_active && <Tag color="default">Inactive</Tag>}
                </Space>
            ),
        },
        {
            title: 'Code',
            dataIndex: 'code',
            render: (c) => <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{c}</code>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            ellipsis: true,
        },
        {
            title: 'Actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            size="small"
                            icon={<PenLine size={13} />}
                            onClick={() => {
                                setEditRecord(record);
                                editForm.setFieldsValue({
                                    name: record.name,
                                    code: record.code,
                                    description: record.description,
                                });
                            }}
                        />
                    </Tooltip>
                    {record.is_active && (
                        <Tooltip title="Deactivate">
                            <Button
                                size="small"
                                danger
                                icon={<Trash2 size={13} />}
                                onClick={() => handleDeactivate(record)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card
                title="Departments"
                extra={
                    <Button type="primary" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                        Add Department
                    </Button>
                }
                className="h-full"
            >
                <Table
                    rowKey="id"
                    dataSource={departments}
                    columns={columns}
                    loading={isLoading}
                    pagination={false}
                    size="small"
                />
            </Card>

            {/* Add modal */}
            <Modal
                title="New Department"
                open={addOpen}
                onOk={handleAdd}
                onCancel={() => { setAddOpen(false); addForm.resetFields(); }}
                confirmLoading={creating}
                destroyOnHidden
            >
                <Form form={addForm} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Code"
                        rules={[
                            { required: true, message: 'Code is required' },
                            { max: 30, message: 'Max 30 characters' },
                        ]}
                    >
                        <Input placeholder="e.g. IT" style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit modal */}
            <Modal
                title="Edit Department"
                open={!!editRecord}
                onOk={handleEdit}
                onCancel={() => setEditRecord(null)}
                confirmLoading={updating}
                destroyOnHidden
            >
                <Form form={editForm} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Code"
                        rules={[
                            { required: true, message: 'Code is required' },
                            { max: 30, message: 'Max 30 characters' },
                        ]}
                    >
                        <Input style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
