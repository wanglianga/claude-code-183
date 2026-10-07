import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  TimePicker,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import { CATEGORIES, POSITION_STATUS, RISK, SKILLS } from '../constants';

export function PositionForm({ form }) {
  return (
    <Form form={form} layout="vertical">
      <Row gutter={12}>
        <Col span={16}>
          <Form.Item name="title" label="岗位名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="category" label="岗位类别" rules={[{ required: true, message: '请选择' }]}>
            <Select options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item name="location" label="服务地点" rules={[{ required: true, message: '请输入地点' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="distanceKm" label="距社区中心（公里）" initialValue={1}>
            <InputNumber min={0} max={30} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="serviceDate" label="服务日期" rules={[{ required: true, message: '请选择' }]}
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            normalize={(v) => (v ? v.format('YYYY-MM-DD') : undefined)}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="startTime" label="开始时间" rules={[{ required: true, message: '请选择' }]}
            getValueProps={(v) => ({ value: v ? dayjs(v, 'HH:mm') : null })}
            normalize={(v) => (v ? v.format('HH:mm') : undefined)}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="endTime" label="结束时间" rules={[{ required: true, message: '请选择' }]}
            getValueProps={(v) => ({ value: v ? dayjs(v, 'HH:mm') : null })}
            normalize={(v) => (v ? v.format('HH:mm') : undefined)}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="durationHours" label="时长（小时）" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0.5} max={12} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="riskLevel" label="风险等级" rules={[{ required: true, message: '请选择' }]}>
            <Select
              options={Object.entries(RISK).map(([v, x]) => ({ value: v, label: x.text }))}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="headcount" label="需求人数" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="pointsPerHour" label="每小时积分" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="requiredSkills" label="所需技能">
            <Select mode="multiple" options={SKILLS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="requiredTraining" label="所需培训（合格）">
            <Select
              allowClear
              options={['急救基础', '儿童陪伴', '调解技巧', '食品安全', '图书管理基础'].map((t) => ({
                value: t,
                label: t,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="description" label="岗位说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}

export default function Positions() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/positions').then((res) => setList(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async () => {
    const values = await form.validateFields();
    await api.post('/positions', { ...values, requiredTraining: values.requiredTraining || '' });
    message.success('岗位已发布');
    setOpen(false);
    form.resetFields();
    load();
  };

  return (
    <Card
      title="服务岗位"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          发布岗位
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        columns={[
          {
            title: '岗位',
            dataIndex: 'title',
            render: (t, r) => <Link to={`/positions/${r.id}`}>{t}</Link>,
          },
          { title: '类别', dataIndex: 'category', width: 110, render: (c) => <Tag>{c}</Tag> },
          { title: '服务时间', render: (_, r) => `${r.serviceDate} ${r.startTime}-${r.endTime}` },
          { title: '地点', dataIndex: 'location', ellipsis: true },
          {
            title: '风险',
            dataIndex: 'riskLevel',
            width: 80,
            render: (r) => <Tag color={RISK[r]?.color}>{RISK[r]?.text}</Tag>,
          },
          {
            title: '人数',
            width: 90,
            render: (_, r) => `${r.assignedCount}/${r.headcount}`,
          },
          {
            title: '积分',
            width: 90,
            render: (_, r) => `${r.pointsPerHour}/时 × ${r.durationHours}h`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (s) => <Tag color={POSITION_STATUS[s]?.color}>{POSITION_STATUS[s]?.text}</Tag>,
          },
        ]}
      />
      <Modal
        title="发布服务岗位"
        open={open}
        width={760}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="发布"
      >
        <PositionForm form={form} />
      </Modal>
    </Card>
  );
}
