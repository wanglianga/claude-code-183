import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login.jsx';
import MyProfile from './pages/volunteer/MyProfile.jsx';
import JobHall from './pages/volunteer/JobHall.jsx';
import MyAssignments from './pages/volunteer/MyAssignments.jsx';
import RewardsShop from './pages/volunteer/RewardsShop.jsx';
import MyTimeline from './pages/volunteer/MyTimeline.jsx';
import Dashboard from './pages/community/Dashboard.jsx';
import Team from './pages/community/Team.jsx';
import JobsManage from './pages/community/JobsManage.jsx';
import JobRecommend from './pages/community/JobRecommend.jsx';
import AssignmentsManage from './pages/community/AssignmentsManage.jsx';
import Incidents from './pages/community/Incidents.jsx';
import Redemptions from './pages/community/Redemptions.jsx';
import VolunteerArchive from './pages/community/VolunteerArchive.jsx';
import RewardsManage from './pages/community/RewardsManage.jsx';

function VolunteerShell() {
  const menus = [
    { to: '/me/profile', label: '我的报名档案' },
    { to: '/me/jobs', label: '岗位大厅' },
    { to: '/me/assignments', label: '我的排班服务' },
    { to: '/me/rewards', label: '积分兑换' },
    { to: '/me/timeline', label: '我的志愿历程' },
  ];
  return (
    <div className="layout">
      <header className="topbar">
        <NavLink to="/" className="brand">🌿 银龄志愿服务平台</NavLink>
        <nav>
          {menus.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <span className="spacer" />
        <VolunteerPoints />
        <LogoutBtn />
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/me/profile" replace />} />
          <Route path="/me/profile" element={<MyProfile />} />
          <Route path="/me/jobs" element={<JobHall />} />
          <Route path="/me/assignments" element={<MyAssignments />} />
          <Route path="/me/rewards" element={<RewardsShop />} />
          <Route path="/me/timeline" element={<MyTimeline />} />
        </Routes>
      </main>
    </div>
  );
}

function VolunteerPoints() {
  const { profile } = useAuth();
  return <span className="user-box">{profile ? `积分 ${profile.pointsBalance} · 服务 ${profile.totalHours}h` : ''}</span>;
}

function LogoutBtn() {
  const { logout } = useAuth();
  const nav = useNavigate();
  return (
    <button
      className="linklike"
      onClick={() => {
        logout();
        nav('/login');
      }}
    >
      退出
    </button>
  );
}

function CommunityShell() {
  const menus = [
    { to: '/c/dashboard', label: '社区看板' },
    { to: '/c/jobs', label: '岗位发布' },
    { to: '/c/assignments', label: '排班与服务' },
    { to: '/c/incidents', label: '异常处置与回访' },
    { to: '/c/redemptions', label: '兑换兑现' },
    { to: '/c/rewards', label: '奖励库存' },
    { to: '/c/team', label: '银龄队伍' },
  ];
  return (
    <div className="layout">
      <header className="topbar">
        <NavLink to="/" className="brand">🌿 银龄志愿服务平台 · 社区端</NavLink>
        <nav>
          {menus.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <span className="spacer" />
        <span className="user-box">社区：{useAuth().user?.name}</span>
        <LogoutBtn />
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/c/dashboard" replace />} />
          <Route path="/c/dashboard" element={<Dashboard />} />
          <Route path="/c/jobs" element={<JobsManage />} />
          <Route path="/c/jobs/:id/recommend" element={<JobRecommend />} />
          <Route path="/c/assignments" element={<AssignmentsManage />} />
          <Route path="/c/incidents" element={<Incidents />} />
          <Route path="/c/redemptions" element={<Redemptions />} />
          <Route path="/c/rewards" element={<RewardsManage />} />
          <Route path="/c/team" element={<Team />} />
          <Route path="/c/team/:id" element={<VolunteerArchive />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.role === 'VOLUNTEER' ? (
            <VolunteerShell />
          ) : (
            <CommunityShell />
          )
        }
      />
    </Routes>
  );
}
