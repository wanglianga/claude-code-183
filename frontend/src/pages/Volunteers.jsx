import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import { FAMILY_CONSENT, HEALTH, PERIODS, SKILLS, WEEKDAYS, fmtSlots } from '../constants';

export function VolunteerForm({ form, initial }) {
  return (
    <Form form={form} layout="vertical" initialValues={initial}>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="gender" label="性别" initialValue="女">
            <Select options={['女', '男'].map((g) => ({ value: g, label: g }))} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="birthDate" label="出生日期" rules={[{ required: true, message: '请选择出生日期' }]}
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            normalize={(v) => (v ? v.format('YYYY-MM-DD') : undefined)}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请输入电话' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="address" label="居住地址">
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="maxDistanceKm" label="可接受最远服务距离（公里）" initialValue={3}>
            <InputNumber min={0.5} max={20} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="healthStatus" label="健康状况" initialValue="good">
            <Select
              options={Object.entries(HEALTH).map(([v, x]) => ({ value: v, label: x.text }))}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="healthNotes" label="健康情况说明（慢性病、注意事项）">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="skills" label="擅长技能">
            <Select mode="multiple" options={SKILLS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item label="可服务时间">
            <Form.List name="availableSlots">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((f) => (
                    <Space key={f.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item name={[f.name, 'weekday']} noStyle>
                        <Select
                          style={{ width: 100 }}
                          options={WEEKDAYS.map((w, i) => ({ value: i + 1, label: w }))}
                        />
                      </Form.Item>
                      <Form.Item name={[f.name, 'periods']} noStyle>
                        <Select
                          mode="multiple"
                          style={{ width: 220 }}
                          options={Object.entries(PERIODS).map(([v, l]) => ({ value: v, label: l }))}
                        />
                      </Form.Item>
                      <Button type="link" danger onClick={() => remove(f.name)}>
                        删除
                      </Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add({ weekday: 1, periods: ['am'] })} block>
                    + 添加可服务时段
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="emergencyContactName" label="紧急联系人">
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="emergencyContactPhone" label="紧急联系电话">
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="emergencyContactRelation" label="与本人关系">
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="familyNotifyRequired" label="是否需要家属知情" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="familyConsent" label="家属对高强度服务的态度" initialValue="unknown">
            <Select
              options={Object.entries(FAMILY_CONSENT).map(([v, x]) => ({ value: v, label: x.text }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="服务状态" initialValue="active">
            <Select
              options={[
                { value: 'active', label: '正常服务' },
                { value: 'suspended', label: '暂停服务' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}

export default function Volunteers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/volunteers').then((res) => setList(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.put(`/volunteers/${editing.id}`, values);
      message.success('已保存');
    } else {
      const res = await api.post('/volunteers', values);
      message.success(`登记成功，登录账号：${res.data.username}，初始密码：${res.data.password}`);
    }
    setOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  return (
    <Card
      title="银龄志愿者档案"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          报名登记
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        columns={[
          {
            title: '姓名',
            dataIndex: 'name',
            render: (n, r) => <Link to={`/volunteers/${r.id}`}>{n}</Link>,
          },
          { title: '年龄', dataIndex: 'age', width: 70 },
          {
            title: '健康状况',
            dataIndex: 'healthStatus',
            render: (h) => <Tag color={HEALTH[h]?.color}>{HEALTH[h]?.text}</Tag>,
          },
          {
            title: '技能',
            dataIndex: 'skills',
            render: (ss) => (ss || []).map((s) => <Tag key={s}>{s}</Tag>),
          },
          { title: '可服务时间', dataIndex: 'availableSlots', render: fmtSlots, ellipsis: true },
          {
            title: '保险',
            dataIndex: 'insuranceValid',
            width: 90,
            render: (ok) => (ok ? <Tag color="green">有效</Tag> : <Tag color="red">失效</Tag>),
          },
          {
            title: '家属态度',
            dataIndex: 'familyConsent',
            render: (f) => <Tag color={FAMILY_CONSENT[f]?.color}>{FAMILY_CONSENT[f]?.text}</Tag>,
          },
          { title: '积分', dataIndex: 'pointsBalance', width: 70 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (s) => (s === 'active' ? <Tag color="green">服务中</Tag> : <Tag>暂停</Tag>),
          },
          {
            title: '操作',
            width: 80,
            render: (_, r) => (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setEditing(r);
                  form.setFieldsValue({ ...r, birthDate: r.birthDate });
                  setOpen(true);
                }}
              >
                编辑
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title={editing ? `编辑档案：${editing.name}` : '志愿者报名登记'}
        width={720}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Button type="primary" onClick={submit}>
            保存
          </Button>
        }
      >
        <VolunteerForm form={form} initial={editing || {}} />
      </Drawer>
    </Card>
  );
}
