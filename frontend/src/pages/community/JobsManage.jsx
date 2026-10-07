import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Empty, Modal, RiskTag } from '../../components';
import { JOB_CATEGORIES } from '../../options';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  title: '', category: JOB_CATEGORIES[0], location: '', distanceKm: 1,
  durationHours: 2, riskLevel: 'LOW', capacity: 1, basePoints: 10,
  requiredSkills: [], requireTraining: true, requiredCourse: '',
  serviceDate: todayStr(), startTime: '09:00', endTime: '11:00', description: '',
};

export default function JobsManage() {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [err, setErr] = useState('');

  async function load() { setJobs(await api('/jobs?all=1')); }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  function toggleSkill(s) {
    setForm({
      ...form,
      requiredSkills: form.requiredSkills.includes(s)
        ? form.requiredSkills.filter((x) => x !== s)
        : [...form.requiredSkills, s],
    });
  }

  async function create() {
    setErr('');
    try {
      await api('/jobs', { method: 'POST', body: { ...form, distanceKm: +form.distanceKm, durationHours: +form.durationHours, capacity: +form.capacity, basePoints: +form.basePoints } });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function escalate(j) {
    const description = prompt(`将岗位「${j.title}」风险升级？不再满足安全条件的志愿者将被自动撤出。请说明原因`, '高温预警/现场施工，风险升高');
    if (!description) return;
    try {
      const r = await api(`/jobs/${j.id}/escalate-risk`, { method: 'POST', body: { description } });
      alert(r.pulledVolunteers.length ? `已升级，并撤出 ${r.pulledVolunteers.length} 名不再安全的志愿者。` : '风险已升级，当前排班均仍满足安全条件。');
      await load();
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div className="flex-between">
        <h1 className="page-title">岗位发布与管理</h1>
        <button onClick={() => setShowForm(true)}>＋ 发布新岗位</button>
      </div>
      <p className="page-sub">填写服务地点、时长、风险等级、人数与积分规则；风险升级时系统会按健康/家属/保险门槛自动撤出不合适的排班。</p>
      {err && <div className="alert alert-error">{err}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>岗位</th><th>类别</th><th>服务时间</th><th>地点</th><th>风险</th>
              <th>时长</th><th>人数</th><th>积分</th><th>培训要求</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && <tr><td colSpan={11}><Empty /></td></tr>}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td><strong>{j.title}</strong><div className="small muted">{j.description}</div></td>
                <td>{j.category}</td>
                <td className="small">{j.serviceDate}<br />{j.startTime?.slice(0, 5)}-{j.endTime?.slice(0, 5)}</td>
                <td className="small">{j.location}</td>
                <td><RiskTag level={j.riskLevel} />{j.riskEscalated && <div className="small" style={{ color: 'var(--danger)' }}>已升级</div>}</td>
                <td>{j.durationHours}h</td>
                <td>{j.capacity}</td>
                <td>{j.basePoints}</td>
                <td className="small">{j.requireTraining ? (j.requiredCourse || '岗前通用培训') : '无'}</td>
                <td>{j.status === 'OPEN' ? <span className="tag green">报名中</span> : <span className="tag gray">已关闭</span>}</td>
                <td className="small">
                  <div className="btn-row" style={{ margin: 0 }}>
                    <Link className="btn btn-ghost btn-sm" to={`/c/jobs/${j.id}/recommend`}>推荐排班</Link>
                    {j.status === 'OPEN' && (
                      <>
                        <button className="btn-warn btn-sm" onClick={() => escalate(j)}>风险升级</button>
                        <button className="btn-ghost btn-sm" onClick={async () => {
                          if (confirm('确认关闭该岗位报名？')) { await api(`/jobs/${j.id}/close`, { method: 'POST' }); load(); }
                        }}>关闭</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="发布新岗位" onClose={() => setShowForm(false)}>
          <label>岗位名称</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：社区书屋图书整理" />
          <div className="field-row">
            <div><label>岗位类别</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {JOB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label>风险等级</label>
              <select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}>
                <option value="LOW">低风险（室内轻量）</option>
                <option value="MEDIUM">中风险（户外/久站/情绪）</option>
                <option value="HIGH">高风险（高强度，须保险+家属同意）</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div><label>服务地点</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><label>地点参考距离(km)</label><input type="number" step="0.1" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div><label>服务日期</label><input type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} /></div>
            <div><label>开始时间</label><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
            <div><label>结束时间</label><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
          </div>
          <div className="field-row">
            <div><label>时长（小时）</label><input type="number" step="0.5" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} /></div>
            <div><label>需要人数</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div><label>基础积分</label><input type="number" value={form.basePoints} onChange={(e) => setForm({ ...form, basePoints: e.target.value })} /></div>
          </div>
          <label>技能要求（多选，可无）</label>
          <div>
            {JOB_CATEGORIES.map((s) => (
              <label key={s} className="checkbox-row" style={{ display: 'inline-flex', marginRight: 12 }}>
                <input type="checkbox" checked={form.requiredSkills.includes(s)} onChange={() => toggleSkill(s)} />{s}
              </label>
            ))}
          </div>
          <label className="checkbox-row" style={{ display: 'flex' }}>
            <input type="checkbox" checked={form.requireTraining} onChange={(e) => setForm({ ...form, requireTraining: e.target.checked })} />
            需要培训合格
          </label>
          {form.requireTraining && (
            <input placeholder="专项课程名（留空则要求“岗前通用培训”）" value={form.requiredCourse} onChange={(e) => setForm({ ...form, requiredCourse: e.target.value })} />
          )}
          <label>岗位说明</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="btn-row">
            <button onClick={create} disabled={!form.title || !form.location}>发布岗位</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
