import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Empty, StatusTag } from '../../components';

const FILTERS = [['', '全部'], ['PENDING', '待兑现'], ['FULFILLED', '已兑现'], ['FAILED_OUT_OF_STOCK', '未兑现']];

export default function Redemptions() {
  const [filter, setFilter] = useState('PENDING');
  const [list, setList] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const [rs, vs] = await Promise.all([
      api(`/redemptions${filter ? `?status=${filter}` : ''}`),
      api('/volunteers'),
    ]);
    setList(rs);
    setVolunteers(vs);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [filter]);

  async function act(r, path, body, ok) {
    setMsg(''); setErr('');
    try {
      await api(`/redemptions/${r.id}/${path}`, { method: 'POST', body: body || {} });
      setMsg(ok);
      await load();
    } catch (e) { setErr(e.message); }
  }

  const vname = (id) => volunteers.find((v) => v.id === id)?.name || `#${id}`;

  return (
    <div>
      <h1 className="page-title">兑换兑现</h1>
      <p className="page-sub">志愿者用积分兑换餐券、理发券、体检优惠和荣誉；社区线下发放后在此确认兑现，无法兑现则积分退回。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <div className="btn-row" style={{ marginTop: 0 }}>
        {FILTERS.map(([v, l]) => (
          <button key={v} className={filter === v ? '' : 'btn-ghost'} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      <div className="table-wrap mt16">
        <table>
          <thead><tr><th>志愿者</th><th>奖励</th><th>积分</th><th>状态</th><th>申请时间</th><th>兑现</th><th>操作</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7}><Empty text="暂无兑换单" /></td></tr>}
            {list.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/c/team/${r.volunteerId}`}>{vname(r.volunteerId)}</Link></td>
                <td>{r.rewardName}</td>
                <td>{r.points}</td>
                <td><StatusTag status={r.status} />{r.remark && <div className="small muted">{r.remark}</div>}</td>
                <td className="small">{new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false })}</td>
                <td className="small">{r.fulfilledBy ? `${r.fulfilledBy} · ${new Date(r.fulfilledAt).toLocaleString('zh-CN', { hour12: false })}` : '-'}</td>
                <td>
                  {r.status === 'PENDING' && (
                    <div className="btn-row" style={{ margin: 0 }}>
                      <button className="btn-sm" onClick={() => act(r, 'fulfill', null, '已兑现，志愿者激励落实。')}>确认兑现</button>
                      <button className="btn-danger btn-sm" onClick={() => {
                        const reason = prompt('无法兑现的原因（积分将原路退回）', '券类临时停发');
                        if (reason) act(r, 'refund', { reason }, '积分已回退志愿者账户。');
                      }}>无法兑现</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
