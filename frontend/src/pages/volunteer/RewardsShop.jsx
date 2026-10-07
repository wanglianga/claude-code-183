import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Empty, StatusTag } from '../../components';

const TYPE_LABEL = { MEAL: '食堂餐券', HAIRCUT: '理发券', HEALTHCHECK: '体检优惠', HONOR: '公益荣誉' };

export default function RewardsShop() {
  const { profile, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const [rs, ds, ls] = await Promise.all([
      api('/rewards'),
      api('/redemptions'),
      api('/volunteers/me/points'),
    ]);
    setRewards(rs);
    setRedemptions(ds);
    setLedger(ls);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function redeem(r) {
    setMsg(''); setErr('');
    if ((profile?.pointsBalance || 0) < r.points) {
      setErr(`积分不足：兑换「${r.name}」需要 ${r.points} 分，当前 ${profile?.pointsBalance} 分`);
      return;
    }
    if (r.stock <= 0) {
      setErr(`「${r.name}」当前库存不足，已通知社区补货，积分不会扣减`);
      return;
    }
    if (!window.confirm(`确认用 ${r.points} 积分兑换「${r.name}」吗？`)) return;
    try {
      await api(`/rewards/${r.id}/redeem`, { method: 'POST' });
      setMsg('兑换申请成功！请在社区工作时间凭券码领取，社区会在系统中确认兑现。');
      await load();
      await refreshProfile();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">积分兑换</h1>
      <p className="page-sub">服务积分可兑换食堂餐券、理发券、体检优惠和公益荣誉；兑换一定会兑现，无法兑现时积分原路退回。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="stat" style={{ marginBottom: 18 }}>
        <div className="label">我的积分余额</div>
        <div className="value">{profile?.pointsBalance ?? 0} 分</div>
      </div>

      <h3>可兑换奖励</h3>
      <div className="grid grid-3">
        {rewards.map((r) => (
          <div className="card" key={r.id}>
            <div className="flex-between">
              <span className="tag blue">{TYPE_LABEL[r.type]}</span>
              <span className={r.stock <= 3 ? 'tag red' : 'tag gray'}>库存 {r.stock}</span>
            </div>
            <h3 className="mt8">{r.name}</h3>
            <div className="muted small" style={{ minHeight: 40 }}>{r.description}</div>
            <div className="flex-between mt8">
              <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{r.points} 分</strong>
              <button className="btn-sm" disabled={r.stock <= 0} onClick={() => redeem(r)}>
                {r.stock <= 0 ? '库存不足' : '立即兑换'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt24">我的兑换单</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>奖励</th><th>消耗积分</th><th>状态</th><th>申请时间</th><th>兑现人</th></tr></thead>
          <tbody>
            {redemptions.length === 0 && <tr><td colSpan={5}><Empty /></td></tr>}
            {redemptions.map((r) => (
              <tr key={r.id}>
                <td>{r.rewardName}</td>
                <td>{r.points}</td>
                <td><StatusTag status={r.status} />{r.remark && <div className="small muted">{r.remark}</div>}</td>
                <td className="small">{new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false })}</td>
                <td className="small">{r.fulfilledBy || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt24">积分流水</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>时间</th><th>变动</th><th>说明</th><th>余额</th></tr></thead>
          <tbody>
            {ledger.length === 0 && <tr><td colSpan={4}><Empty text="暂无积分记录" /></td></tr>}
            {ledger.map((l) => (
              <tr key={l.id}>
                <td className="small">{new Date(l.createdAt).toLocaleString('zh-CN', { hour12: false })}</td>
                <td style={{ color: l.change > 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
                  {l.change > 0 ? `+${l.change}` : l.change}
                </td>
                <td>{l.detail}</td>
                <td>{l.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
