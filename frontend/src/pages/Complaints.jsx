import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Table,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const STATUS = {
  open: { text: '待处理', color: 'red' },
  processing: { text: '处理中', color: 'orange' },
  resolved: { text: '已办结', color: 'green' },
};

export default function Complaints() {
  const [list, setList] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [open, setOpen] = useState(false);
  const [handleTarget, setHandleTarget] = useState(null);
  const [form] = Form.useForm();
  const [hForm] = Form.useForm();

  const load = () => api.get('/complaints').then((res) => setList(res.data));
  useEffect(() => {
    load();
    api.get('/volunteers').then((res) => setVolunteers(res.data));
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    await api.post('/complaints', values);
    message.success('投诉已登记，已自动生成关怀回访任务');
    setOpen(false);
    form.resetFields();
    load();
  };

  const submitHandle = async () => {
    const values = await hForm.validateFields();
    await api.put(`/complaints/${handleTarget.id}`, values);
    message.success('已更新');
    setHandleTarget(null);
    hForm.resetFields();
    load();
  };

  return (
    <Card
      title="服务对象投诉处理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          登记投诉
        </Button>
      }
    >
      <Table
        rowKey="id"
        dataSource={list}
        columns={[
          { title: '时间', dataIndex: 'createdAt', render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
          { title: '被投诉志愿者', dataIndex: 'volunteerName' },
          { title: '关联岗位', dataIndex: 'positionTitle', render: (t) => t || '-' },
          { title: '投诉人', dataIndex: 'complainant' },
          { title: '内容', dataIndex: 'content', ellipsis: true },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s) => <Tag color={STATUS[s].color}>{STATUS[s].text}</Tag>,
          },
          { title: '处理记录', dataIndex: 'handleNote', ellipsis: true, render: (h) => h || '-' },
          {
            title: '操作',
            width: 100,
            render: (_, r) =>
              r.status !== 'resolved' && (
                <Button size="small" onClick={() => setHandleTarget(r)}>
                  处理
                </Button>
              ),
          },
        ]}
      />

      <Modal title="登记服务对象投诉" open={open} onOk={submit} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="volunteerId" label="被投诉志愿者" rules={[{ required: true, message: '请选择' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={volunteers.map((v) => ({ value: v.id, label: v.name }))}
            />
          </Form.Item>
          <Form.Item name="complainant" label="投诉人（服务对象）" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：食堂就餐老人张大爷" />
          </Form.Item>
          <Form.Item name="content" label="投诉内容" rules={[{ required: true, message: '请输入' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={handleTarget ? `处理投诉（${handleTarget.volunteerName}）` : ''}
        open={!!handleTarget}
        onOk={submitHandle}
        onCancel={() => setHandleTarget(null)}
      >
        <Form form={hForm} layout="vertical">
          <Form.Item name="status" label="处理状态" rules={[{ required: true, message: '请选择' }]}>
            <Select
              options={[
                { value: 'processing', label: '处理中' },
                { value: 'resolved', label: '办结' },
              ]}
            />
          </Form.Item>
          <Form.Item name="handleNote" label="处理记录">
            <Input.TextArea rows={3} placeholder="核实情况、沟通结果、改进措施" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
