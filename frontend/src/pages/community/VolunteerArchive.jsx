import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Empty, Modal, StatusTag } from '../../components';

export default function VolunteerArchive() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [events, setEvents] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showTraining, setShowTraining] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [training, setTraining] = useState({ course: '岗前通用培训', passed: true, note: '' });
  const [follow, setFollow] = useState({ kind: 'HEALTH', content: '', healthStatus: 'GOOD', continueWilling: true });

  async function load() {
    const [detail, tl, fus] = await Promise.all([
      api(`/volunteers/${id}`),
      api(`/volunteers/${id}/timeline`),
      api(`/volunteers/${id}/followups`),
    ]);
    setP(detail); setEvents(tl); setFollowups(fus);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [id]);

  async function patch(body, ok) {
    setErr(''); setMsg('');
    try { await api(`/volunteers/${id}`, { method: 'PUT', body }); setMsg(ok); await load(); }
    catch (e) { setErr(e.message); }
  }

  async function addTraining() {
    try {
      await api(`/volunteers/${id}/trainings`, { method: 'POST', body: training });
      setShowTraining(false);
      setMsg('培训记录已入档。');
      await load();
    } catch (e) { setErr(e.message); }
  }
  async function addFollowUp() {
    try {
      await api(`/volunteers/${id}/followups`, { method: 'POST', body: follow });
      setShowFollowUp(false);
      setMsg('关怀回访已入档。');
      await load();
    } catch (e) { setErr(e.message); }
  }

  if (err) return <div className="alert alert-error">{err}</div>;
  if (!p) return <div className="card">加载中…</div>;

  return (
    <div>
      <Link to="/c/team" className="small">← 返回队伍名单</Link>
      <div className="flex-between mt8">
        <h1 className="page-title">{p.name} 的志愿档案</h1>
        <div>
          <StatusTag status={p.status} /> <StatusTag status={p.insuranceStatus} />
        </div>
      </div>
      <p className="page-sub">同一条档案连续记录报名、培训、排班、签到、服务、积分、兑换、异常与关怀回访全过程。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3>报名信息</h3>
          <table>
            <tbody>
              <tr><th>年龄 / 性别</th><td>{p.age} 岁 / {p.gender || '-'}</td></tr>
              <tr><th>电话</th><td>{p.phone || '-'}</td></tr>
              <tr><th>住址 / 距离</th><td>{p.address || '-'} / {p.distanceKm} km</td></tr>
              <tr><th>健康情况</th><td>{p.health}{p.healthNote ? `（${p.healthNote}）` : ''}</td></tr>
              <tr><th>擅长技能</th><td>{(p.skills || []).map((s) => <span key={s} className="tag">{s}</span>)}</td></tr>
              <tr><th>可服务时间</th><td>{(p.timePrefs || []).join('、') || '-'}</td></tr>
              <tr><th>紧急联系人</th><td>{p.emergencyContactName || '-'} {p.emergencyContactPhone || ''}</td></tr>
              <tr><th>家属知情</th><td>{p.familyAware ? '已知情' : '未知情'} ｜ 同意高强度：{p.familyConsentHigh ? '是' : '否'}</td></tr>
              <tr><th>保险</th><td>{p.insuranceStatus}{p.insuranceExpireDate ? `（至 ${p.insuranceExpireDate}）` : ''}</td></tr>
              <tr><th>累计服务</th><td>{p.totalHours} 小时 · 积分余额 {p.pointsBalance} · 评价 ⭐{p.ratingAvg}（{p.ratingCount} 次）</td></tr>
            </tbody>
          </table>
          <div className="btn-row">
            <button className="btn-sm" onClick={() => setShowTraining(true)}>登记培训</button>
            <button className="btn-sm" onClick={() => setShowFollowUp(true)}>关怀回访</button>
            {p.status === 'ACTIVE'
              ? <button className="btn-warn btn-sm" onClick={() => patch({ status: 'PAUSED' }, '档案已暂停（身体或家属原因）。')}>暂停档案</button>
              : <button className="btn-sm" onClick={() => patch({ status: 'ACTIVE' }, '档案已恢复在队。')}>恢复在队</button>}
            <button className="btn-ghost btn-sm" onClick={() => {
              const d = prompt('设置保险到期日（YYYY-MM-DD），状态将同步更新', p.insuranceExpireDate || '');
              if (d) patch({ insuranceStatus: 'VALID', insuranceExpireDate: d }, '保险信息已更新。');
            }}>更新保险</button>
          </div>
        </div>

        <div className="card">
          <h3>培训记录</h3>
          {(p.trainings || []).length === 0 && <Empty text="暂无培训记录" />}
          {(p.trainings || []).map((t) => (
            <div key={t.id} className="flex-between" style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
              <span>{t.course}{t.note ? <span className="muted small">（{t.note}）</span> : null}</span>
              {t.passed ? <span className="tag green">合格</span> : <span className="tag red">未通过</span>}
            </div>
          ))}
          <h3 className="mt16">最近关怀回访</h3>
          {followups.length === 0 && <Empty text="暂无回访记录" />}
          {followups.slice(0, 5).map((f) => (
            <div key={f.id} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
              <span className={`tag ${f.healthStatus === 'GOOD' ? 'green' : f.healthStatus === 'FAIR' ? 'amber' : 'red'}`}>
                {f.kind === 'HEALTH' ? '健康关怀' : f.kind === 'SERVICE' ? '服务回访' : f.kind === 'COMPLAINT' ? '投诉回访' : '例行回访'}
              </span>
              <div className="small">{f.content}</div>
              <div className="small muted">{f.visitedBy} · {new Date(f.createdAt).toLocaleString('zh-CN', { hour12: false })} · 愿意继续：{f.continueWilling ? '是' : '否'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>连续志愿档案（全程时间线）</h3>
        {events.length <= 1 && <Empty text="暂无服务记录" />}
        <div className="timeline">
          {events.map((e, i) => (
            <div key={i} className={`ev ${e.stage === 'incident' ? 'incident' : e.stage === 'followup' ? 'followup' : ''}`}>
              <div className="ev-at">{new Date(e.at).toLocaleString('zh-CN', { hour12: false })} · <span className="tag">{e.stageLabel}</span></div>
              <div className="ev-title">{e.title}</div>
              {e.detail && <div className="small muted">{e.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      {showTraining && (
        <Modal title="登记培训记录" onClose={() => setShowTraining(false)}>
          <label>课程名称</label>
          <input value={training.course} onChange={(e) => setTraining({ ...training, course: e.target.value })} />
          <label className="checkbox-row" style={{ display: 'flex' }}>
            <input type="checkbox" checked={training.passed} onChange={(e) => setTraining({ ...training, passed: e.target.checked })} />
            考核合格（合格后才会通过相关岗位的培训门槛）
          </label>
          <label>备注</label>
          <input value={training.note} onChange={(e) => setTraining({ ...training, note: e.target.value })} />
          <div className="btn-row">
            <button onClick={addTraining}>保存</button>
            <button className="btn-ghost" onClick={() => setShowTraining(false)}>取消</button>
          </div>
        </Modal>
      )}

      {showFollowUp && (
        <Modal title="关怀回访" onClose={() => setShowFollowUp(false)}>
          <div className="field-row">
            <div><label>类型</label>
              <select value={follow.kind} onChange={(e) => setFollow({ ...follow, kind: e.target.value })}>
                <option value="HEALTH">健康关怀</option>
                <option value="SERVICE">服务回访</option>
                <option value="COMPLAINT">投诉回访</option>
                <option value="ROUTINE">例行回访</option>
              </select>
            </div>
            <div><label>健康状况</label>
              <select value={follow.healthStatus} onChange={(e) => setFollow({ ...follow, healthStatus: e.target.value })}>
                <option value="GOOD">良好</option><option value="FAIR">一般</option><option value="POOR">较差</option>
              </select>
            </div>
          </div>
          <label className="checkbox-row" style={{ display: 'flex' }}>
            <input type="checkbox" checked={follow.continueWilling} onChange={(e) => setFollow({ ...follow, continueWilling: e.target.checked })} />
            愿意继续参与
          </label>
          <label>回访内容</label>
          <textarea value={follow.content} onChange={(e) => setFollow({ ...follow, content: e.target.value })} />
          <div className="btn-row">
            <button onClick={addFollowUp} disabled={!follow.content}>保存回访</button>
            <button className="btn-ghost" onClick={() => setShowFollowUp(false)}>取消</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
