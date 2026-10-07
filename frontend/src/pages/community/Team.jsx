import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Empty, StatusTag } from '../../components';

export default function Team() {
  const [list, setList] = useState([]);
  const [kw, setKw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api('/volunteers').then(setList).catch((e) => setErr(e.message)); }, []);

  const filtered = list.filter((v) => !kw || v.name.includes(kw) || v.health.includes(kw) || (v.skills || []).some((s) => s.includes(kw)));

  return (
    <div>
      <h1 className="page-title">银龄志愿队伍</h1>
      <p className="page-sub">名单不仅展示时长积分，也标注健康、家属知情与保险等安全要素；点击姓名查看从报名到回访的完整档案。</p>
      {err && <div className="alert alert-error">{err}</div>}
      <input style={{ maxWidth: 320, marginBottom: 12 }} placeholder="按姓名/健康/技能搜索" value={kw} onChange={(e) => setKw(e.target.value)} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>姓名</th><th>年龄</th><th>健康情况</th><th>技能</th><th>可服务时间</th>
              <th>家属</th><th>保险</th><th>状态</th><th>时长/积分</th><th>评价</th><th>档案</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={11}><Empty /></td></tr>}
            {filtered.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.name}</strong></td>
                <td>{v.age}</td>
                <td className="small">{v.health}</td>
                <td className="small">{(v.skills || []).map((s) => <span key={s} className="tag">{s}</span>)}</td>
                <td className="small muted">{(v.timePrefs || []).join('、')}</td>
                <td className="small">
                  {v.familyAware ? <span className="tag green">已知情</span> : <span className="tag red">未知情</span>}
                  {v.familyConsentHigh ? <span className="tag green">同意高强度</span> : <span className="tag gray">未同意高强度</span>}
                </td>
                <td><StatusTag status={v.insuranceStatus} />{v.insuranceExpireDate && <div className="small muted">至 {v.insuranceExpireDate}</div>}</td>
                <td><StatusTag status={v.status} /></td>
                <td className="small">{v.totalHours}h<br />{v.pointsBalance} 分</td>
                <td>⭐{v.ratingAvg}{v.ratingCount ? ` (${v.ratingCount})` : ''}</td>
                <td><Link className="btn btn-ghost btn-sm" to={`/c/team/${v.id}`}>查看档案</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
