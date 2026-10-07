import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import { TRIGGER_LABEL } from '../constants';

export default function FollowUps() {
  const [list, setList] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [open, setOpen] = useState(false);
  const [doneTarget, setDoneTarget] = useState(null);
  const [form] = Form.useForm();
  const [dForm] = Form.useForm();

  const load = () => api.get('/followups').then((res) => setList(res.data));
  useEffect(() => {
    load();
    api.get('/volunteers').then((res) => setVolunteers(res.data));
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    await api.post('/followups', values);
    message.success('回访任务已创建');
    setOpen(false);
    form.resetFields();
    load();
  };

  const submitDone = async () => {
    const values = await dForm.validateFields();
    await api.put(`/followups/${doneTarget.id}/done`, values);
    message.success('回访已完成并记入志愿档案');
    setDoneTarget(null);
    dForm.resetFields();
    load();
  };

  return (
    <Card
      title="关怀回访（身体不适、缺勤、投诉、风险升级等触发）"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          主动发起回访
        </Button>
      }
    >
      <Table
        rowKey="id"
        dataSource={list}
        columns={[
          { title: '创建时间', dataIndex: 'createdAt', render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
          { title: '志愿者', dataIndex: 'volunteerName' },
          {
            title: '触发原因',
            dataIndex: 'trigger',
            render: (t) => (
              <Tag color={['discomfort', 'complaint', 'risk_escalation'].includes(t) ? 'red' : 'orange'}>
                {TRIGGER_LABEL[t]}
              </Tag>
            ),
          },
          { title: '回访内容', dataIndex: 'content', ellipsis: true },
          {
            title: '状态',
            dataIndex: 'done',
            render: (d) => (d ? <Tag color="green">已回访</Tag> : <Tag color="red">待回访</Tag>),
          },
          { title: '回访结果', dataIndex: 'result', ellipsis: true, render: (r) => r || '-' },
          { title: '回访人', dataIndex: 'staffName', render: (s) => s || '-' },
          {
            title: '操作',
            width: 110,
            render: (_, r) =>
              !r.done && (
                <Button size="small" type="primary" onClick={() => setDoneTarget(r)}>
                  完成回访
                </Button>
              ),
          },
        ]}
      />

      <Modal title="发起关怀回访" open={open} onOk={submit} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="volunteerId" label="志愿者" rules={[{ required: true, message: '请选择' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={volunteers.map((v) => ({ value: v.id, label: v.name }))}
            />
          </Form.Item>
          <Form.Item name="trigger" label="回访类型" initialValue="manual" rules={[{ required: true }]}>
            <Select
              options={Object.entries(TRIGGER_LABEL).map(([v, l]) => ({ value: v, label: l }))}
            />
          </Form.Item>
          <Form.Item name="content" label="回访内容" rules={[{ required: true, message: '请输入' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={doneTarget ? `完成回访：${doneTarget.volunteerName}` : ''}
        open={!!doneTarget}
        onOk={submitDone}
        onCancel={() => setDoneTarget(null)}
      >
        <Form form={dForm} layout="vertical">
          <Form.Item name="result" label="回访结果" rules={[{ required: true, message: '请填写回访结果' }]}>
            <Input.TextArea rows={3} placeholder="如：身体已恢复，下周可继续参与低风险岗位" />
          </Form.Item>
          <Form.Item name="staffName" label="回访人">
            <Input placeholder="如：社区工作人员-小周" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
