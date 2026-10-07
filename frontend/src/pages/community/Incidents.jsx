import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Empty, incidentLabel, Modal, StatusTag } from '../../components';

const INCIDENT_TYPES = [
  ['FEEL_UNWELL', '身体不适'],
  ['ABSENT', '临时缺勤'],
  ['RISK_UPGRADE', '岗位风险升级'],
  ['COMPLAINT', '服务对象投诉'],
  ['INSURANCE_EXPIRED', '保险过期'],
  ['FAMILY_OBJECTION', '家属反对高强度服务'],
  ['REWARD_OUT_OF_STOCK', '兑换库存不足'],
];

export default function Incidents() {
  const [tab, setTab] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ volunteerId: '', type: 'FEEL_UNWELL', description: '' });
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followForm, setFollowForm] = useState({
    volunteerId: '', kind: 'HEALTH', content: '', healthStatus: 'GOOD', continueWilling: true,
  });

  async function load() {
    const [ins, fus, vs] = await Promise.all([
      api('/incidents'), api('/followups'), api('/volunteers'),
    ]);
    setIncidents(ins);
    setFollowups(fus);
    setVolunteers(vs);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const vname = (id) => volunteers.find((v) => v.id === id)?.name || `#${id}`;

  async function resolve(i) {
    const resolution = prompt('处置措施与结果', '已电话联系本人及家属，身体无碍后再恢复排班');
    if (!resolution) return;
    const resume = confirm('点击“确定”同时恢复志愿者在队状态；点击“取消”保持暂停。');
    try {
      await api(`/incidents/${i.id}/resolve`, { method: 'POST', body: { resolution, resumeVolunteer: resume } });
      setMsg('异常已处置' + (resume ? '，志愿者已恢复在队。' : '。'));
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function createIncident() {
    try {
      await api('/incidents', { method: 'POST', body: { ...createForm, volunteerId: +createForm.volunteerId } });
      setShowCreate(false);
      setMsg('异常已登记并入志愿档案。');
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function createFollowUp() {
    try {
      await api(`/volunteers/${followForm.volunteerId}/followups`, {
        method: 'POST',
        body: { ...followForm, volunteerId: undefined },
      });
      setShowFollowUp(false);
      setMsg('关怀回访已记录。');
      await load();
    } catch (e) { setErr(e.message); }
  }

  const open = incidents.filter((i) => i.status === 'OPEN');
  const resolved = incidents.filter((i) => i.status === 'RESOLVED');

  return (
    <div>
      <h1 className="page-title">异常处置与关怀回访</h1>
      <p className="page-sub">身体不适、临时缺勤、风险升级、投诉、保险过期、家属反对、库存不足——全部挂入本人志愿档案并跟踪闭环。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className={tab === 'incidents' ? '' : 'btn-ghost'} onClick={() => setTab('incidents')}>异常台账（{incidents.length}）</button>
        <button className={tab === 'followups' ? '' : 'btn-ghost'} onClick={() => setTab('followups')}>关怀回访（{followups.length}）</button>
        <span className="spacer" style={{ flex: 1 }} />
        {tab === 'incidents'
          ? <button onClick={() => { setCreateForm({ volunteerId: volunteers[0]?.id || '', type: 'FEEL_UNWELL', description: '' }); setShowCreate(true); }}>＋ 登记异常</button>
          : <button onClick={() => { setFollowForm({ volunteerId: volunteers[0]?.id || '', kind: 'HEALTH', content: '', healthStatus: 'GOOD', continueWilling: true }); setShowFollowUp(true); }}>＋ 新增回访</button>}
      </div>

      {tab === 'incidents' && (
        <>
          <h3 className="mt16">待处置（{open.length}）</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>志愿者</th><th>类型</th><th>级别</th><th>描述</th><th>时间</th><th>操作</th></tr></thead>
              <tbody>
                {open.length === 0 && <tr><td colSpan={6}><Empty text="没有待处置异常" /></td></tr>}
                {open.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/c/team/${i.volunteerId}`}>{vname(i.volunteerId)}</Link></td>
                    <td>{incidentLabel(i.type)}</td>
                    <td><span className={`tag ${i.level === 'CRITICAL' ? 'red' : i.level === 'WARN' ? 'amber' : 'blue'}`}>
                      {i.level === 'CRITICAL' ? '紧急' : i.level === 'WARN' ? '关注' : '一般'}</span></td>
                    <td className="small">{i.description}</td>
                    <td className="small">{new Date(i.createdAt).toLocaleString('zh-CN', { hour12: false })}</td>
                    <td>
                      <button className="btn-sm" onClick={() => resolve(i)}>处置闭环</button>
                      <button className="btn-ghost btn-sm" onClick={() => {
                        setFollowForm({ volunteerId: i.volunteerId, kind: i.type === 'COMPLAINT' ? 'COMPLAINT' : 'HEALTH', content: '', healthStatus: 'GOOD', continueWilling: true });
                        setTab('followups');
                        setShowFollowUp(true);
                      }}>去回访</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt24">已处置（{resolved.length}）</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>志愿者</th><th>类型</th><th>描述</th><th>处置结果</th><th>处置人</th></tr></thead>
              <tbody>
                {resolved.length === 0 && <tr><td colSpan={5}><Empty text="暂无已处置记录" /></td></tr>}
                {resolved.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/c/team/${i.volunteerId}`}>{vname(i.volunteerId)}</Link></td>
                    <td>{incidentLabel(i.type)}</td>
                    <td className="small">{i.description}</td>
                    <td className="small">{i.resolution}<div className="muted">{i.handledBy} · {new Date(i.resolvedAt).toLocaleString('zh-CN', { hour12: false })}</div></td>
                    <td>{i.handledBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'followups' && (
        <div className="table-wrap mt16">
          <table>
            <thead><tr><th>志愿者</th><th>回访类型</th><th>健康状况</th><th>愿意继续</th><th>内容</th><th>回访人</th><th>时间</th></tr></thead>
            <tbody>
              {followups.length === 0 && <tr><td colSpan={7}><Empty text="暂无回访记录" /></td></tr>}
              {followups.map((f) => (
                <tr key={f.id}>
                  <td><Link to={`/c/team/${f.volunteerId}`}>{vname(f.volunteerId)}</Link></td>
                  <td>{f.kind === 'HEALTH' ? '健康关怀' : f.kind === 'SERVICE' ? '服务回访' : f.kind === 'COMPLAINT' ? '投诉回访' : '例行回访'}</td>
                  <td><span className={`tag ${f.healthStatus === 'GOOD' ? 'green' : f.healthStatus === 'FAIR' ? 'amber' : 'red'}`}>
                    {f.healthStatus === 'GOOD' ? '良好' : f.healthStatus === 'FAIR' ? '一般' : '较差'}</span></td>
                  <td>{f.continueWilling ? '是' : '否'}</td>
                  <td className="small">{f.content}</td>
                  <td className="small">{f.visitedBy}</td>
                  <td className="small">{new Date(f.createdAt).toLocaleString('zh-CN', { hour12: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="登记异常" onClose={() => setShowCreate(false)}>
          <label>志愿者</label>
          <select value={createForm.volunteerId} onChange={(e) => setCreateForm({ ...createForm, volunteerId: e.target.value })}>
            {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}（{v.age} 岁）</option>)}
          </select>
          <label>异常类型</label>
          <select value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
            {INCIDENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label>情况描述</label>
          <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          <div className="btn-row">
            <button onClick={createIncident} disabled={!createForm.description}>登记入档</button>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>取消</button>
          </div>
        </Modal>
      )}

      {showFollowUp && (
        <Modal title="关怀回访" onClose={() => setShowFollowUp(false)}>
          <label>志愿者</label>
          <select value={followForm.volunteerId} onChange={(e) => setFollowForm({ ...followForm, volunteerId: e.target.value })}>
            {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <div className="field-row">
            <div><label>回访类型</label>
              <select value={followForm.kind} onChange={(e) => setFollowForm({ ...followForm, kind: e.target.value })}>
                <option value="HEALTH">健康关怀</option>
                <option value="SERVICE">服务回访</option>
                <option value="COMPLAINT">投诉回访</option>
                <option value="ROUTINE">例行回访</option>
              </select>
            </div>
            <div><label>当前健康状况</label>
              <select value={followForm.healthStatus} onChange={(e) => setFollowForm({ ...followForm, healthStatus: e.target.value })}>
                <option value="GOOD">良好</option><option value="FAIR">一般</option><option value="POOR">较差</option>
              </select>
            </div>
          </div>
          <label className="checkbox-row" style={{ display: 'flex' }}>
            <input type="checkbox" checked={followForm.continueWilling} onChange={(e) => setFollowForm({ ...followForm, continueWilling: e.target.checked })} />
            本人愿意继续参与志愿服务
          </label>
          <label>回访内容（身体恢复、家属反馈、改进措施等）</label>
          <textarea value={followForm.content} onChange={(e) => setFollowForm({ ...followForm, content: e.target.value })} />
          <div className="btn-row">
            <button onClick={createFollowUp} disabled={!followForm.content}>保存回访</button>
            <button className="btn-ghost" onClick={() => setShowFollowUp(false)}>取消</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
