import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Tag } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ScheduleOutlined,
  GiftOutlined,
  WarningOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
  ProfileOutlined,
  CarryOutOutlined,
  GoldOutlined,
} from '@ant-design/icons';
import { getUser } from './constants';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Volunteers from './pages/Volunteers';
import VolunteerDetail from './pages/VolunteerDetail';
import Positions from './pages/Positions';
import PositionDetail from './pages/PositionDetail';
import Redemptions from './pages/Redemptions';
import Complaints from './pages/Complaints';
import FollowUps from './pages/FollowUps';
import MyTasks from './pages/MyTasks';
import MyPoints from './pages/MyPoints';
import MyProfile from './pages/MyProfile';

const { Header, Sider, Content } = Layout;

function Shell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isStaff = user?.role === 'staff';

  const menuItems = isStaff
    ? [
        { key: '/', icon: <DashboardOutlined />, label: '总览看板' },
        { key: '/volunteers', icon: <TeamOutlined />, label: '志愿者档案' },
        { key: '/positions', icon: <ScheduleOutlined />, label: '岗位与排班' },
        { key: '/redemptions', icon: <GiftOutlined />, label: '积分兑换' },
        { key: '/complaints', icon: <WarningOutlined />, label: '投诉处理' },
        { key: '/followups', icon: <HeartOutlined />, label: '关怀回访' },
      ]
    : [
        { key: '/', icon: <CarryOutOutlined />, label: '我的服务任务' },
        { key: '/my-points', icon: <GoldOutlined />, label: '我的积分与兑换' },
        { key: '/my-profile', icon: <ProfileOutlined />, label: '我的志愿档案' },
      ];

  const selected =
    menuItems
      .map((m) => m.key)
      .filter((k) => (k === '/' ? location.pathname === '/' : location.pathname.startsWith(k)))
      .sort((a, b) => b.length - a.length)[0] || '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={208}>
        <div
          style={{
            padding: '18px 16px',
            fontWeight: 700,
            fontSize: 16,
            color: '#d4380d',
            lineHeight: 1.4,
          }}
        >
          银龄志愿服务平台
          <div style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>
            {isStaff ? '社区工作端' : '志愿者端'}
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: () => {
                    localStorage.clear();
                    navigate('/login');
                  },
                },
              ],
            }}
          >
            <span style={{ cursor: 'pointer' }}>
              <UserOutlined style={{ marginRight: 8 }} />
              {user?.name}
              <Tag color={isStaff ? 'geekblue' : 'orange'} style={{ marginLeft: 8 }}>
                {isStaff ? '社区工作人员' : '银龄志愿者'}
              </Tag>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}

function RequireAuth({ children }) {
  const user = getUser();
  if (!user || !localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

function StaffOnly({ children }) {
  const user = getUser();
  if (user?.role !== 'staff') return <Navigate to="/" replace />;
  return children;
}

function VolunteerOnly({ children }) {
  const user = getUser();
  if (user?.role !== 'volunteer') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomeSwitch />
            </RequireAuth>
          }
        />
        <Route
          path="/volunteers"
          element={
            <RequireAuth>
              <StaffOnly>
                <Volunteers />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/volunteers/:id"
          element={
            <RequireAuth>
              <StaffOnly>
                <VolunteerDetail />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/positions"
          element={
            <RequireAuth>
              <StaffOnly>
                <Positions />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/positions/:id"
          element={
            <RequireAuth>
              <StaffOnly>
                <PositionDetail />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/redemptions"
          element={
            <RequireAuth>
              <StaffOnly>
                <Redemptions />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/complaints"
          element={
            <RequireAuth>
              <StaffOnly>
                <Complaints />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/followups"
          element={
            <RequireAuth>
              <StaffOnly>
                <FollowUps />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/my-points"
          element={
            <RequireAuth>
              <VolunteerOnly>
                <MyPoints />
              </VolunteerOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/my-profile"
          element={
            <RequireAuth>
              <VolunteerOnly>
                <MyProfile />
              </VolunteerOnly>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function HomeSwitch() {
  const user = getUser();
  return user?.role === 'staff' ? <Dashboard /> : <MyTasks />;
}
