import React, { useEffect, useState } from 'react';
import { Alert, Card, Col, Progress, Row, Statistic, Table, Tag } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  GoldOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/stats/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <Card loading />;

  const { team, coverage, totals, alerts } = data;

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="在册银龄志愿者" value={team.total} suffix={`人（活跃 ${team.active}）`} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="累计完成服务" value={totals.completed} suffix="次" prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="累计服务时长" value={totals.hours} suffix="小时" prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="累计发放积分" value={totals.pointsAwarded} suffix="分" prefix={<GoldOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card title="队伍稳定性" size="small">
            <Row gutter={[8, 16]}>
              <Col span={12}>
                <Statistic title="有服务记录志愿者" value={team.served} suffix={`/ ${team.total} 人`} />
              </Col>
              <Col span={12}>
                <Statistic title="平均服务评价" value={team.avgRating} suffix="/ 5 星" />
              </Col>
              <Col span={12}>
                <div style={{ color: '#888', marginBottom: 4 }}>临时缺勤率</div>
                <Progress
                  percent={team.absenceRate}
                  size="small"
                  status={team.absenceRate > 20 ? 'exception' : 'normal'}
                />
              </Col>
              <Col span={12}>
                <div style={{ color: '#888', marginBottom: 4 }}>健康状况分布</div>
                <Tag color="green">良好 {team.healthGood}</Tag>
                <Tag color="orange">一般 {team.healthFair}</Tag>
                <Tag color="red">较弱 {team.healthPoor}</Tag>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={14}>
          <Card title="服务覆盖（按岗位类别）" size="small">
            <Table
              size="small"
              rowKey="category"
              pagination={false}
              dataSource={coverage}
              columns={[
                { title: '岗位类别', dataIndex: 'category' },
                { title: '发布岗位', dataIndex: 'positions', width: 80 },
                { title: '完成服务', dataIndex: 'completed', width: 80 },
                {
                  title: '服务时长（小时）',
                  dataIndex: 'hours',
                  render: (h, r) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Progress
                        percent={Math.min(100, Math.round((h / Math.max(...coverage.map((c) => c.hours), 1)) * 100))}
                        showInfo={false}
                        style={{ flex: 1 }}
                        strokeColor="#d4380d"
                      />
                      <span style={{ width: 40 }}>{h}</span>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
            安全与权益提醒（不只看服务时长，更要看安全边界与权益兑现）
          </span>
        }
        size="small"
        style={{ marginTop: 16 }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Alert
              type={alerts.expiredInsurance.length ? 'error' : 'success'}
              message={`保险失效志愿者 ${alerts.expiredInsurance.length} 人`}
              description={
                alerts.expiredInsurance.length ? (
                  <div>
                    {alerts.expiredInsurance.map((x) => (
                      <div key={x.volunteerId}>
                        <Link to={`/volunteers/${x.volunteerId}`}>{x.name}</Link>
                        <span style={{ color: '#999' }}>（保险至 {x.endDate}）</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 4, color: '#999' }}>保险失效者不能参与中高风险岗位</div>
                  </div>
                ) : (
                  '全部志愿者保险有效'
                )
              }
            />
          </Col>
          <Col span={8}>
            <Alert
              type={alerts.pendingFollowUps ? 'warning' : 'success'}
              message={`待完成关怀回访 ${alerts.pendingFollowUps} 件`}
              description={
                <span>
                  未结投诉 {alerts.openComplaints} 件；家属反对高强度服务 {alerts.familyOpposed} 人。
                  <Link to="/followups"> 前往回访</Link>、<Link to="/complaints">处理投诉</Link>
                </span>
              }
            />
          </Col>
          <Col span={8}>
            <Alert
              type={alerts.failedRedemptions ? 'warning' : 'success'}
              message={`兑换失败（库存不足）${alerts.failedRedemptions} 笔`}
              description={
                <span>
                  积分兑换需兑现承诺，库存不足要及时补货。
                  <Link to="/redemptions"> 查看兑换管理</Link>
                </span>
              }
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
