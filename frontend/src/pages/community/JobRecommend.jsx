import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Empty, RiskTag, StatusTag } from '../../components';

export default function JobRecommend() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setData(await api(`/jobs/${id}/recommend`));
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [id]);

  async function schedule(volunteerId, force) {
    setErr(''); setMsg('');
    try {
      await api(`/jobs/${id}/schedule`, { method: 'POST', body: { volunteerId, force } });
      setMsg(force ? '已强制排班，该志愿者档案中保留安全提醒。' : '排班成功。');
      await load();
    } catch (e) { setErr(e.message); }
  }
  async function auto() {
    setErr(''); setMsg('');
    try {
      const r = await api(`/jobs/${id}/auto-schedule`, { method: 'POST' });
      setMsg(`一键排班完成，共安排 ${r.scheduled} 名志愿者。`);
      await load();
    } catch (e) { setErr(e.message); }
  }

  if (err) return <div className="alert alert-error">{err}</div>;
  if (!data) return <div className="card">加载中…</div>;
  const j = data.job;

  return (
    <div>
      <div className="flex-between">
        <div>
          <Link to="/c/jobs" className="small">← 返回岗位列表</Link>
          <h1 className="page-title mt8">{j.title}</h1>
        </div>
        <RiskTag level={j.riskLevel} />
      </div>
      <p className="page-sub">
        {j.serviceDate} {j.startTime?.slice(0, 5)}-{j.endTime?.slice(0, 5)} · 📍{j.location} · {j.durationHours} 小时 ·
        已排 {data.filled}/{data.capacity} 人 · 基础 {j.basePoints} 积分
        {j.requireTraining && <> · 要求培训：{j.requiredCourse || '岗前通用培训'}</>}
      </p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="btn-row">
        <button onClick={auto} disabled={data.filled >= data.capacity}>一键自动排班（按推荐分补足 {Math.max(0, data.capacity - data.filled)} 人）</button>
      </div>
      <div className="alert alert-info mt16">
        推荐综合考虑：能力技能、距离、健康风险、培训合格、可服务时间与历史评价。
        <strong>硬性安全门槛不满足的志愿者不能排班</strong>；中高风险岗位还会检查家属知情/同意与保险有效性。
      </div>

      {data.candidates.length === 0 && <Empty />}
      <div className="grid grid-2 mt16">
        {data.candidates.map((c) => (
          <div className="card" key={c.volunteer.id} style={{ borderColor: c.eligible ? undefined : '#eebcb5' }}>
            <div className="flex-between">
              <h3>
                {c.volunteer.name}
                <span className="muted small"> {c.volunteer.age} 岁 · {c.volunteer.health}</span>
              </h3>
              {c.alreadyAssigned && <StatusTag status="SCHEDULED" />}
            </div>
            <div className="small">
              技能：{c.volunteer.skills?.join('、') || '无'} · 距服务点 {c.volunteer.distanceKm}km ·
              历史 ⭐{c.volunteer.ratingAvg}
              <br />
              保险：<StatusTag status={c.volunteer.insuranceStatus} />
              {c.volunteer.familyAware ? <span className="tag green">家属知情</span> : <span className="tag red">家属未知情</span>}
              {c.volunteer.familyConsentHigh ? <span className="tag green">同意高强度</span> : <span className="tag gray">未同意高强度</span>}
            </div>

            {c.blockers.length > 0 && (
              <div className="alert alert-error mt8" style={{ margin: '8px 0 0' }}>
                <strong>安全拦截：</strong>
                <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                  {c.blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}
            {c.warnings.length > 0 && (
              <div className="small mt8">
                {c.warnings.map((w, i) => <div key={i} className="warning-line">⚠ {w}</div>)}
              </div>
            )}
            <details className="mt8">
              <summary className="small" style={{ cursor: 'pointer' }}>推荐打分依据（{c.total} 分）</summary>
              <div className="small mt8">
                {c.reasons.map((r, i) => <div key={i} className="reason-line">✓ {r}</div>)}
              </div>
            </details>

            <div className="btn-row">
              {c.alreadyAssigned ? (
                <span className="tag green">已在名单</span>
              ) : c.eligible ? (
                <button className="btn-sm" onClick={() => schedule(c.volunteer.id, false)}>确认排班</button>
              ) : (
                <button className="btn-danger btn-sm" onClick={() => {
                  if (window.confirm(`安全门槛不满足：\n${c.blockers.join('\n')}\n\n强制排班可能危及志愿者安全，确认仍要安排吗？`)) {
                    schedule(c.volunteer.id, true);
                  }
                }}>强制排班（不推荐）</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
