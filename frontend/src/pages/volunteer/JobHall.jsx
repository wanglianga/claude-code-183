import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Empty, RiskTag, StatusTag } from '../../components';

export default function JobHall() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [mine, setMine] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const [js, as] = await Promise.all([api('/jobs'), api('/assignments')]);
    setJobs(js);
    setMine(as);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function selfApply(jobId) {
    setMsg(''); setErr('');
    try {
      await api(`/jobs/${jobId}/apply`, { method: 'POST' });
      setMsg('报名成功！社区将结合推荐结果确认排班，可在“我的排班服务”查看。');
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const myJobIds = new Set(mine.filter((a) => ['RECOMMENDED', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED'].includes(a.status)).map((a) => a.jobId));

  return (
    <div>
      <h1 className="page-title">岗位大厅</h1>
      <p className="page-sub">社区发布的服务岗位；报名会经过健康风险、培训、保险与家属知情等安全校验。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      {jobs.length === 0 && <Empty text="暂无开放岗位" />}
      <div className="grid grid-2">
        {jobs.map((j) => (
          <div className="card" key={j.id}>
            <div className="flex-between">
              <h3>{j.title}</h3>
              <RiskTag level={j.riskLevel} />
            </div>
            <div className="muted small">
              {j.serviceDate} {j.startTime?.slice(0, 5)}-{j.endTime?.slice(0, 5)} · {j.durationHours} 小时 · {j.basePoints} 积分
            </div>
            <p style={{ margin: '8px 0' }}>{j.description}</p>
            <div className="small">
              📍 {j.location}（距您约 {Math.abs((profile?.distanceKm || 0) - j.distanceKm).toFixed(1)} 公里参考差）<br />
              👥 需 {j.capacity} 人
              {j.requiredSkills?.length > 0 && <> · 技能：{j.requiredSkills.join('、')}</>}
              {j.requireTraining && <> · 需培训：{j.requiredCourse || '岗前通用培训'}</>}
            </div>
            <div className="btn-row">
              {myJobIds.has(j.id) ? (
                <span className="tag green">您已报名/在排</span>
              ) : (
                <button className="btn-sm" onClick={() => selfApply(j.id)}>我要报名</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
