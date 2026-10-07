import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Space, Table, Tag, Timeline } from 'antd';
import dayjs from 'dayjs';
import api from '../api';
import { ARCHIVE_TYPE, FAMILY_CONSENT, HEALTH, fmtSlots, getUser } from '../constants';

export default function MyProfile() {
  const [data, setData] = useState(null);
  const user = getUser();

  useEffect(() => {
    api.get(`/volunteers/${user.volunteerId}`).then((res) => setData(res.data));
  }, []);

  if (!data) return <Card loading />;

  return (
    <div>
      <Card
        title={
          <Space>
            我的志愿档案
            <Tag color={HEALTH[data.healthStatus]?.color}>健康：{HEALTH[data.healthStatus]?.text}</Tag>
            {data.insuranceValid ? <Tag color="green">保险有效</Tag> : <Tag color="red">保险失效，请联系社区续保</Tag>}
          </Space>
        }
      >
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="姓名">{data.name}</Descriptions.Item>
          <Descriptions.Item label="年龄">{data.age} 岁</Descriptions.Item>
          <Descriptions.Item label="积分余额">
            <b style={{ color: '#d4380d' }}>{data.pointsBalance}</b>
          </Descriptions.Item>
          <Descriptions.Item label="技能" span={2}>
            {(data.skills || []).map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </Descriptions.Item>
          <Descriptions.Item label="可服务时间">{fmtSlots(data.availableSlots)}</Descriptions.Item>
          <Descriptions.Item label="紧急联系人" span={2}>
            {data.emergencyContactName}（{data.emergencyContactRelation}）{data.emergencyContactPhone}
          </Descriptions.Item>
          <Descriptions.Item label="家属态度">
            <Tag color={FAMILY_CONSENT[data.familyConsent]?.color}>
              {FAMILY_CONSENT[data.familyConsent]?.text}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="我的志愿服务全记录" style={{ marginTop: 16 }} size="small">
        <Timeline
          style={{ marginTop: 16 }}
          items={data.timeline.map((e) => ({
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
      </Card>

      <Card title="我的培训记录" style={{ marginTop: 16 }} size="small">
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
            { title: '有效期', dataIndex: 'expiresAt', render: (e) => e || '长期' },
          ]}
        />
      </Card>
    </div>
  );
}
