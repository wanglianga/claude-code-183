import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
} from 'antd';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import { ARCHIVE_TYPE, FAMILY_CONSENT, HEALTH, fmtSlots } from '../constants';

export default function VolunteerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [tForm] = Form.useForm();
  const [iForm] = Form.useForm();

  const load = () => api.get(`/volunteers/${id}`).then((res) => setData(res.data));
  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <Card loading />;

  const addTraining = async () => {
    const v = await tForm.validateFields();
    await api.post(`/volunteers/${id}/trainings`, v);
    message.success('培训记录已登记');
    setTrainingOpen(false);
    tForm.resetFields();
    load();
  };

  const addInsurance = async () => {
    const v = await iForm.validateFields();
    await api.post(`/volunteers/${id}/insurances`, v);
    message.success('保险已登记');
    setInsuranceOpen(false);
    iForm.resetFields();
    load();
  };

  return (
    <div>
      <Card
        title={
          <Space>
            {data.name}
            <Tag color={HEALTH[data.healthStatus]?.color}>{HEALTH[data.healthStatus]?.text}</Tag>
            {data.insuranceValid ? <Tag color="green">保险有效</Tag> : <Tag color="red">保险失效</Tag>}
            <Tag color={FAMILY_CONSENT[data.familyConsent]?.color}>
              {FAMILY_CONSENT[data.familyConsent]?.text}
            </Tag>
            {data.familyNotifyRequired && <Tag color="purple">需家属知情</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => setTrainingOpen(true)}>登记培训</Button>
            <Button onClick={() => setInsuranceOpen(true)}>登记保险</Button>
          </Space>
        }
      >
        <Descriptions size="small" column={4}>
          <Descriptions.Item label="年龄">{data.age} 岁</Descriptions.Item>
          <Descriptions.Item label="电话">{data.phone}</Descriptions.Item>
          <Descriptions.Item label="积分余额">
            <b style={{ color: '#d4380d' }}>{data.pointsBalance}</b>
          </Descriptions.Item>
          <Descriptions.Item label="可接受距离">{data.maxDistanceKm} km</Descriptions.Item>
          <Descriptions.Item label="住址" span={2}>{data.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="技能" span={2}>
            {(data.skills || []).map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </Descriptions.Item>
          <Descriptions.Item label="可服务时间" span={2}>{fmtSlots(data.availableSlots)}</Descriptions.Item>
          <Descriptions.Item label="健康说明" span={2}>{data.healthNotes || '-'}</Descriptions.Item>
          <Descriptions.Item label="紧急联系人" span={2}>
            {data.emergencyContactName}（{data.emergencyContactRelation}）{data.emergencyContactPhone}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'timeline',
              label: '志愿档案时间线（报名→培训→排班→签到→服务→积分→兑换→回访）',
              children: (
                <Timeline
                  style={{ marginTop: 16 }}
                  items={data.timeline.map((e) => ({
                    color: 'gray',
                    children: (
                      <div>
                        <Space>
                          <Tag color={ARCHIVE_TYPE[e.type]?.color}>{ARCHIVE_TYPE[e.type]?.text}</Tag>
                          <b>{e.title}</b>
                          <span style={{ color: '#999', fontSize: 12 }}>
                            {dayjs(e.createdAt).format('YYYY-MM-DD HH:mm')}
                          </span>
                        </Space>
                        {e.detail && <div style={{ color: '#666', marginTop: 4 }}>{e.detail}</div>}
                      </div>
                    ),
                  }))}
                />
              ),
            },
            {
              key: 'trainings',
              label: `培训记录（${data.trainings.length}）`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.trainings}
                  pagination={false}
                  columns={[
                    { title: '培训名称', dataIndex: 'title' },
                    { title: '培训日期', dataIndex: 'trainedAt' },
                    {
                      title: '考核',
                      dataIndex: 'qualified',
                      render: (q) => (q ? <Tag color="green">合格</Tag> : <Tag color="red">未合格</Tag>),
                    },
                    {
                      title: '有效期',
                      dataIndex: 'expiresAt',
                      render: (e) =>
                        e ? (
                          <span style={{ color: e < dayjs().format('YYYY-MM-DD') ? 'red' : undefined }}>
                            {e}
                          </span>
                        ) : (
                          '长期'
                        ),
                    },
                    { title: '备注', dataIndex: 'note' },
                  ]}
                />
              ),
            },
            {
              key: 'insurances',
              label: `保险（${data.insurances.length}）`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.insurances}
                  pagination={false}
                  columns={[
                    { title: '保险公司', dataIndex: 'provider' },
                    { title: '保单号', dataIndex: 'policyNo' },
                    { title: '生效日', dataIndex: 'startDate' },
                    {
                      title: '到期日',
                      dataIndex: 'endDate',
                      render: (e) => (
                        <span style={{ color: e < dayjs().format('YYYY-MM-DD') ? 'red' : undefined }}>
                          {e}
                          {e < dayjs().format('YYYY-MM-DD') && '（已过期）'}
                        </span>
                      ),
                    },
                    { title: '保障范围', dataIndex: 'coverage' },
                  ]}
                />
              ),
            },
            {
              key: 'points',
              label: `积分流水（${data.pointsTxs.length}）`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={data.pointsTxs}
                  pagination={false}
                  columns={[
                    {
                      title: '时间',
                      dataIndex: 'createdAt',
                      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
                    },
                    {
                      title: '类型',
                      dataIndex: 'type',
                      render: (t) =>
                        ({ earn: <Tag color="green">服务获得</Tag>, redeem: <Tag color="magenta">兑换扣减</Tag>, adjust: <Tag>调整</Tag> })[t],
                    },
                    {
                      title: '积分',
                      dataIndex: 'points',
                      render: (p) => (
                        <span style={{ color: p > 0 ? 'green' : '#d4380d', fontWeight: 600 }}>
                          {p > 0 ? `+${p}` : p}
                        </span>
                      ),
                    },
                    { title: '余额', dataIndex: 'balanceAfter' },
                    { title: '说明', dataIndex: 'note' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal title="登记培训记录" open={trainingOpen} onOk={addTraining} onCancel={() => setTrainingOpen(false)}>
        <Form form={tForm} layout="vertical">
          <Form.Item name="title" label="培训名称" rules={[{ required: true, message: '请输入培训名称' }]}>
            <Input placeholder="如：急救基础 / 儿童陪伴 / 调解技巧 / 食品安全" />
          </Form.Item>
          <Form.Item name="trainedAt" label="培训日期" rules={[{ required: true, message: '请选择日期' }]}
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            normalize={(v) => (v ? v.format('YYYY-MM-DD') : undefined)}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="qualified" label="考核合格" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="expiresAt" label="合格证有效期至（可空）"
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            normalize={(v) => (v ? v.format('YYYY-MM-DD') : undefined)}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="登记保险" open={insuranceOpen} onOk={addInsurance} onCancel={() => setInsuranceOpen(false)}>
        <Form form={iForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="provider" label="保险公司" rules={[{ required: true, message: '请输入' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="policyNo" label="保单号" rules={[{ required: true, message: '请输入' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="生效日期" rules={[{ required: true, message: '请选择' }]}
                getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
                normalize={(v) => (v ? v.format('YYYY-MM-DD') : undefined)}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="到期日期" rules={[{ required: true, message: '请选择' }]}
                getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
                normalize={(v) => (v ? v.format('YYYY-MM-DD') : undefined)}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="coverage" label="保障范围">
            <Input placeholder="如：志愿服务意外险" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
