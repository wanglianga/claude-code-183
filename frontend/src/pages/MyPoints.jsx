import React, { useEffect, useState } from 'react';
import { Button, Card, Col, message, Popconfirm, Row, Statistic, Table, Tabs, Tag } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import { getUser } from '../constants';

export default function MyPoints() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const user = getUser();

  const load = () => {
    api.get('/redemptions/items').then((res) => setItems(res.data));
    api.get('/redemptions/orders').then((res) => setOrders(res.data));
    api.get(`/volunteers/${user.volunteerId}`).then((res) => setProfile(res.data));
  };
  useEffect(load, []);

  const redeem = async (item) => {
    try {
      const res = await api.post(`/redemptions/items/${item.id}/redeem`);
      message.success(res.message || '兑换成功');
    } finally {
      load();
    }
  };

  if (!profile) return <Card loading />;

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="我的积分余额" value={profile.pointsBalance} suffix="分" valueStyle={{ color: '#d4380d' }} />
          </Card>
        </Col>
        <Col span={16}>
          <Card title="积分兑换（食堂餐券 / 理发券 / 体检优惠 / 公益荣誉）" size="small">
            <Row gutter={[12, 12]}>
              {items
                .filter((i) => i.active)
                .map((item) => (
                  <Col span={6} key={item.id}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <GiftOutlined style={{ fontSize: 28, color: '#d4380d' }} />
                      <div style={{ fontWeight: 600, margin: '8px 0 4px' }}>{item.name}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>{item.category}</div>
                      <div style={{ margin: '8px 0' }}>
                        <b style={{ color: '#d4380d' }}>{item.pointsCost}</b> 积分
                        <span style={{ color: '#888', fontSize: 12 }}>（库存 {item.stock}）</span>
                      </div>
                      <Popconfirm
                        title={`确认用 ${item.pointsCost} 积分兑换「${item.name}」？`}
                        onConfirm={() => redeem(item)}
                      >
                        <Button
                          type="primary"
                          size="small"
                          disabled={item.stock <= 0 || profile.pointsBalance < item.pointsCost}
                        >
                          {item.stock <= 0 ? '缺货' : profile.pointsBalance < item.pointsCost ? '积分不足' : '兑换'}
                        </Button>
                      </Popconfirm>
                    </Card>
                  </Col>
                ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'txs',
              label: '积分流水',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={profile.pointsTxs}
                  pagination={false}
                  columns={[
                    { title: '时间', dataIndex: 'createdAt', render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
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
            {
              key: 'orders',
              label: `兑换记录（${orders.length}）`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={orders}
                  pagination={false}
                  columns={[
                    { title: '时间', dataIndex: 'createdAt', render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
                    { title: '兑换项目', dataIndex: 'itemName' },
                    { title: '消耗积分', dataIndex: 'points' },
                    {
                      title: '结果',
                      render: (_, r) =>
                        r.status === 'fulfilled' ? (
                          <Tag color="green">已兑现</Tag>
                        ) : (
                          <Tag color="red">失败：{r.failReason}</Tag>
                        ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
