import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Upload,
  Image,
} from 'antd';
import { ThunderboltOutlined, CameraOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '../api';
import { ASSIGN_STATUS, HEALTH, POSITION_STATUS, RISK, fileToBase64 } from '../constants';
import { PositionForm } from './Positions';

export default function PositionDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const load = () => api.get(`/positions/${id}`).then((res) => setData(res.data));
  const loadRecs = () => {
    setRecLoading(true);
    api.get(`/positions/${id}/recommendations`).then((res) => setRecs(res.data)).finally(() => setRecLoading(false));
  };

  useEffect(() => {
    load();
    loadRecs();
  }, [id]);

  if (!data) return <Card loading />;

  const assign = async (rec) => {
    await api.post('/assignments', {
      positionId: data.id,
      volunteerId: rec.volunteer.id,
      score: rec.score,
      note: '按智能推荐排班',
    });
    message.success(`已为 ${rec.volunteer.name} 排班`);
    load();
    loadRecs();
  };

  const saveEdit = async () => {
    const values = await editForm.validateFields();
    const res = await api.put(`/positions/${id}`, { ...values, requiredTraining: values.requiredTraining || '' });
    message.success(res.message || '已保存');
    setEditOpen(false);
    load();
    loadRecs();
  };

  const doComplete = async () => {
    const values = await completeForm.validateFields();
    await api.post(`/assignments/${completeTarget.id}/complete`, values);
    message.success('服务完成，积分已入账');
    setCompleteTarget(null);
    completeForm.resetFields();
    load();
  };

  const doAbsent = (a) => {
    let reason = '';
    Modal.confirm({
      title: `标记 ${a.volunteerName} 临时缺勤`,
      content: (
        <Input.TextArea
          placeholder="缺勤原因（如：身体不适、家中有事）"
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      onOk: async () => {
        if (!reason.trim()) {
          message.error('请填写缺勤原因');
          return Promise.reject();
        }
        await api.post(`/assignments/${a.id}/absent`, { reason });
        message.success('已标记缺勤，并生成关怀回访任务');
        load();
      },
    });
  };

  const doCancel = (a) => {
    let reason = '';
    Modal.confirm({
      title: `取消 ${a.volunteerName} 的排班`,
      content: (
        <Input.TextArea
          placeholder="取消原因（如：身体不适、家属反对）"
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      onOk: async () => {
        if (!reason.trim()) {
          message.error('请填写取消原因');
          return Promise.reject();
        }
        const res = await api.post(`/assignments/${a.id}/cancel`, { reason });
        message.success(res.message || '已取消');
        load();
      },
    });
  };

  return (
    <div>
      <Card
        title={
          <Space>
            {data.title}
            <Tag>{data.category}</Tag>
            <Tag color={RISK[data.riskLevel]?.color}>{RISK[data.riskLevel]?.text}</Tag>
            <Tag color={POSITION_STATUS[data.status]?.color}>{POSITION_STATUS[data.status]?.text}</Tag>
          </Space>
        }
        extra={
          <Button
            onClick={() => {
              editForm.setFieldsValue(data);
              setEditOpen(true);
            }}
          >
            编辑岗位 / 调整风险等级
          </Button>
        }
      >
        <Descriptions size="small" column={4}>
          <Descriptions.Item label="服务时间">
            {data.serviceDate} {data.startTime}-{data.endTime}（{data.durationHours} 小时）
          </Descriptions.Item>
          <Descriptions.Item label="地点">{data.location}（{data.distanceKm}km）</Descriptions.Item>
          <Descriptions.Item label="需求人数">
            {data.assignments.filter((a) => ['assigned', 'checked_in', 'completed'].includes(a.status)).length}/{data.headcount} 人
          </Descriptions.Item>
          <Descriptions.Item label="积分规则">{data.pointsPerHour} 分/小时</Descriptions.Item>
          <Descriptions.Item label="所需技能" span={2}>
            {(data.requiredSkills || []).map((s) => <Tag key={s}>{s}</Tag>)}
          </Descriptions.Item>
          <Descriptions.Item label="所需培训" span={2}>{data.requiredTraining || '无要求'}</Descriptions.Item>
          <Descriptions.Item label="岗位说明" span={4}>{data.description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'recs',
              label: (
                <span>
                  <ThunderboltOutlined /> 智能推荐排班
                </span>
              ),
              children: (
                <div>
                  <Alert
                    type="info"
                    style={{ marginBottom: 12 }}
                    message="推荐依据：技能匹配（30）+ 距离（20）+ 健康风险适配（20）+ 培训合格（20）+ 历史评价（10）；保险失效、家属反对、健康较弱、时间不匹配者将被硬性拦截"
                  />
                  <Table
                    rowKey={(r) => r.volunteer.id}
                    loading={recLoading}
                    dataSource={recs || []}
                    pagination={false}
                    columns={[
                      {
                        title: '推荐度',
                        width: 140,
                        render: (_, r) => (
                          <Progress
                            percent={r.score}
                            size="small"
                            strokeColor={r.eligible ? '#d4380d' : '#bbb'}
                          />
                        ),
                      },
                      {
                        title: '志愿者',
                        render: (_, r) => (
                          <Space>
                            {r.volunteer.name}（{r.volunteer.age} 岁）
                            <Tag color={HEALTH[r.volunteer.healthStatus]?.color}>
                              {HEALTH[r.volunteer.healthStatus]?.text}
                            </Tag>
                            {r.volunteer.insuranceValid ? (
                              <Tag color="green">保险有效</Tag>
                            ) : (
                              <Tag color="red">保险失效</Tag>
                            )}
                          </Space>
                        ),
                      },
                      {
                        title: '评分明细 / 拦截原因',
                        render: (_, r) => (
                          <div style={{ fontSize: 12 }}>
                            {r.blockers.map((b) => (
                              <Tag key={b} color="red" style={{ marginBottom: 2 }}>{b}</Tag>
                            ))}
                            <Collapse
                              ghost
                              items={[
                                {
                                  key: '1',
                                  label: <span style={{ fontSize: 12 }}>查看评分明细</span>,
                                  children: r.reasons.map((x, i) => <div key={i}>{x}</div>),
                                },
                              ]}
                            />
                          </div>
                        ),
                      },
                      {
                        title: '操作',
                        width: 110,
                        render: (_, r) =>
                          r.eligible ? (
                            <Button type="primary" size="small" onClick={() => assign(r)}>
                              排班
                            </Button>
                          ) : (
                            <Button size="small" disabled>
                              不适合
                            </Button>
                          ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'assignments',
              label: `排班与服务（${data.assignments.length}）`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={data.assignments}
                  pagination={false}
                  columns={[
                    { title: '志愿者', dataIndex: 'volunteerName' },
                    { title: '电话', dataIndex: 'volunteerPhone' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (s) => <Tag color={ASSIGN_STATUS[s]?.color}>{ASSIGN_STATUS[s]?.text}</Tag>,
                    },
                    {
                      title: '推荐得分',
                      dataIndex: 'recommendScore',
                      render: (s) => (s != null ? Math.round(s) : '-'),
                    },
                    {
                      title: '签到',
                      render: (_, r) =>
                        r.checkInAt ? (
                          <Space>
                            {new Date(r.checkInAt).toLocaleString('zh-CN')}
                            {r.checkInPhoto && (
                              <Image src={r.checkInPhoto} width={32} height={32} style={{ objectFit: 'cover' }} />
                            )}
                          </Space>
                        ) : (
                          '-'
                        ),
                    },
                    {
                      title: '服务凭证',
                      render: (_, r) =>
                        r.servicePhoto ? (
                          <Image src={r.servicePhoto} width={32} height={32} style={{ objectFit: 'cover' }} />
                        ) : r.confirmedBy ? (
                          `负责人确认：${r.confirmedBy}`
                        ) : (
                          '-'
                        ),
                    },
                    {
                      title: '评价',
                      render: (_, r) => (r.rating ? `${r.rating} 星 ${r.reviewNote || ''}` : '-'),
                    },
                    { title: '积分', dataIndex: 'pointsAwarded', render: (p) => p || '-' },
                    {
                      title: '取消/缺勤原因',
                      dataIndex: 'cancelReason',
                      ellipsis: true,
                      render: (c) => c || '-',
                    },
                    {
                      title: '操作',
                      width: 220,
                      render: (_, r) => (
                        <Space size={4} wrap>
                          {r.status === 'assigned' && (
                            <Button
                              size="small"
                              onClick={async () => {
                                await api.post(`/assignments/${r.id}/checkin`, {});
                                message.success('已代签到');
                                load();
                              }}
                            >
                              代签到
                            </Button>
                          )}
                          {['assigned', 'checked_in'].includes(r.status) && (
                            <>
                              <Button size="small" type="primary" onClick={() => setCompleteTarget(r)}>
                                完成确认
                              </Button>
                              <Button size="small" onClick={() => doAbsent(r)}>
                                缺勤
                              </Button>
                              <Button size="small" danger onClick={() => doCancel(r)}>
                                取消
                              </Button>
                            </>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="编辑岗位（调高风险等级将自动重新评估已排班志愿者）"
        open={editOpen}
        width={760}
        onOk={saveEdit}
        onCancel={() => setEditOpen(false)}
      >
        <PositionForm form={editForm} />
      </Modal>

      <Modal
        title={completeTarget ? `完成确认：${completeTarget.volunteerName}` : ''}
        open={!!completeTarget}
        onOk={doComplete}
        onCancel={() => setCompleteTarget(null)}
        okText="确认完成并发放积分"
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item label="服务照片（或填写确认负责人）" name="photo">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file) => {
                try {
                  const b64 = await fileToBase64(file);
                  completeForm.setFieldsValue({ photo: b64 });
                  message.success('照片已读取');
                } catch (e) {
                  message.error(e.message);
                }
                return false;
              }}
            >
              <Button icon={<CameraOutlined />}>上传服务照片</Button>
            </Upload>
            <Form.Item noStyle shouldUpdate>
              {() =>
                completeForm.getFieldValue('photo') ? (
                  <Image src={completeForm.getFieldValue('photo')} width={80} style={{ marginTop: 8 }} />
                ) : null
              }
            </Form.Item>
          </Form.Item>
          <Form.Item name="confirmedBy" label="确认负责人（无照片时必填）">
            <Input placeholder="如：社区工作人员-小周" />
          </Form.Item>
          <Form.Item name="rating" label="服务评价（1-5 星）">
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reviewNote" label="评价说明">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
