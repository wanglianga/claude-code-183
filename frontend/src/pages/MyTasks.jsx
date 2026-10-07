import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Image,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Upload,
} from 'antd';
import { CameraOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import { ASSIGN_STATUS, RISK } from '../constants';
import { fileToBase64 } from '../constants';

export default function MyTasks() {
  const [list, setList] = useState([]);
  const [photoTarget, setPhotoTarget] = useState(null); // {assignment, mode: 'checkin'|'complete'}
  const [photo, setPhoto] = useState('');

  const load = () => api.get('/assignments/mine').then((res) => setList(res.data));
  useEffect(() => {
    load();
  }, []);

  const submitPhoto = async () => {
    const a = photoTarget.assignment;
    if (photoTarget.mode === 'checkin') {
      await api.post(`/assignments/${a.id}/checkin`, { photo });
      message.success('签到成功');
    } else {
      if (!photo) {
        message.error('自行完成服务需上传服务照片');
        return;
      }
      const res = await api.post(`/assignments/${a.id}/complete`, { photo });
      message.success(res.message || '服务完成');
    }
    setPhotoTarget(null);
    setPhoto('');
    load();
  };

  const quickCheckIn = async (a) => {
    await api.post(`/assignments/${a.id}/checkin`, {});
    message.success('签到成功');
    load();
  };

  const reportDiscomfort = (a) => {
    let reason = '身体不适';
    Modal.confirm({
      title: '报告身体不适 / 取消排班',
      content: (
        <div>
          <Alert
            type="warning"
            message="您的健康安全最重要，取消后社区将安排关怀回访，不影响您的积分与后续报名。"
            style={{ marginBottom: 8 }}
          />
          <Input.TextArea
            defaultValue="身体不适"
            placeholder="请简单说明情况"
            onChange={(e) => (reason = e.target.value)}
          />
        </div>
      ),
      okText: '确认取消排班',
      onOk: async () => {
        const res = await api.post(`/assignments/${a.id}/cancel`, { reason });
        message.success(res.message || '已取消');
        load();
      },
    });
  };

  return (
    <Card title="我的服务任务">
      <Alert
        type="info"
        style={{ marginBottom: 12 }}
        message="服务当天请签到；完成后上传服务照片或由社区负责人确认，积分自动到账。如身体不适可随时取消排班，社区会进行关怀回访。"
      />
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          {
            title: '岗位',
            render: (_, r) => (
              <Space direction="vertical" size={0}>
                <b>{r.position?.title}</b>
                <span style={{ color: '#888', fontSize: 12 }}>{r.position?.location}</span>
              </Space>
            ),
          },
          {
            title: '服务时间',
            render: (_, r) =>
              r.position ? `${r.position.serviceDate} ${r.position.startTime}-${r.position.endTime}` : '-',
          },
          {
            title: '风险',
            render: (_, r) =>
              r.position && <Tag color={RISK[r.position.riskLevel]?.color}>{RISK[r.position.riskLevel]?.text}</Tag>,
          },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s) => <Tag color={ASSIGN_STATUS[s]?.color}>{ASSIGN_STATUS[s]?.text}</Tag>,
          },
          {
            title: '积分',
            render: (_, r) =>
              r.pointsAwarded ? `+${r.pointsAwarded}` : r.position ? `可得 ${Math.round(r.position.durationHours * r.position.pointsPerHour)}` : '-',
          },
          {
            title: '取消原因',
            dataIndex: 'cancelReason',
            ellipsis: true,
            render: (c) => c || '-',
          },
          {
            title: '操作',
            width: 300,
            render: (_, r) => (
              <Space wrap size={4}>
                {r.status === 'assigned' && (
                  <>
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => quickCheckIn(r)}>
                      签到
                    </Button>
                    <Button size="small" onClick={() => setPhotoTarget({ assignment: r, mode: 'checkin' })}>
                      拍照签到
                    </Button>
                  </>
                )}
                {['assigned', 'checked_in'].includes(r.status) && (
                  <>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<CameraOutlined />}
                      onClick={() => setPhotoTarget({ assignment: r, mode: 'complete' })}
                    >
                      上传照片完成服务
                    </Button>
                    <Button size="small" danger onClick={() => reportDiscomfort(r)}>
                      身体不适/取消
                    </Button>
                  </>
                )}
                {r.status === 'completed' && r.servicePhoto && (
                  <Image src={r.servicePhoto} width={32} height={32} style={{ objectFit: 'cover' }} />
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={photoTarget?.mode === 'checkin' ? '拍照签到' : '上传服务照片完成服务'}
        open={!!photoTarget}
        onOk={submitPhoto}
        onCancel={() => {
          setPhotoTarget(null);
          setPhoto('');
        }}
      >
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={async (file) => {
            try {
              const b64 = await fileToBase64(file);
              setPhoto(b64);
              message.success('照片已读取');
            } catch (e) {
              message.error(e.message);
            }
            return false;
          }}
        >
          <Button icon={<CameraOutlined />}>选择照片（≤2MB）</Button>
        </Upload>
        {photo && <Image src={photo} width={120} style={{ marginTop: 12 }} />}
      </Modal>
    </Card>
  );
}
