import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      nav(u.role === 'VOLUNTEER' ? '/me/profile' : '/c/dashboard');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function quick(u, p) {
    setUsername(u);
    setPassword(p);
  }

  return (
    <div className="card login-wrap">
      <h1>🌿 银龄志愿服务平台</h1>
      <p className="muted" style={{ textAlign: 'center' }}>报名 · 排班 · 服务 · 积分 · 关怀，一条档案全程记录</p>
      <form onSubmit={submit}>
        <label>用户名</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名" />
        <label>密码</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
        {err && <div className="alert alert-error mt16">{err}</div>}
        <button style={{ width: '100%', marginTop: 18 }} disabled={loading}>
          {loading ? '登录中…' : '登 录'}
        </button>
      </form>
      <div className="login-accounts">
        <strong>测试账号（点击快速填充）</strong>
        <div className="mt8">
          <a onClick={() => quick('community', 'community123')} href="#">社区工作人员：community / community123</a>
        </div>
        <div>
          <a onClick={() => quick('wang', '123456')} href="#">老年志愿者：wang / 123456</a>
        </div>
        <div className="muted small mt8">其余志愿者：li、zhao、chen、liu、zhou，密码均为 123456</div>
      </div>
    </div>
  );
}
