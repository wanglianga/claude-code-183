import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { StatusTag } from '../../components';
import { SKILL_OPTIONS, TIME_OPTIONS } from '../../options';

function MultiCheck({ options, selected, onChange }) {
  function toggle(v) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  }
  return (
    <div className="mt8">
      {options.map((o) => (
        <label key={o} className="checkbox-row" style={{ display: 'inline-flex', marginRight: 14 }}>
          <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

export default function MyProfile() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    refreshProfile().then((p) => setForm(normalize(p)));
    api('/volunteers/me/profile').then((p) => setTrainings(p?.trainings || []));
    // eslint-disable-next-line
  }, []);

  function normalize(p) {
    return {
      ...p,
      skills: p.skills || [],
      timePrefs: p.timePrefs || [],
    };
  }

  if (!form) return <div className="card">加载中…</div>;

  const set = (k, v) => setForm({ ...form, [k]: v });

  async function save() {
    setMsg(''); setErr('');
    try {
      const p = await api('/volunteers/me/profile', { method: 'PUT', body: form });
      setForm(normalize(p));
      await refreshProfile();
      setMsg('档案已保存。社区排班时会依据最新的健康、保险与家属知情情况进行安全校验。');
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">我的报名档案</h1>
      <p className="page-sub">您的健康、技能、时间与保险信息用于安全排班；带 <span style={{ color: 'var(--danger)' }}>*</span> 的安全信息变化时请及时更新。</p>

      <div className="card">
        <div className="flex-between">
          <h3>基本信息</h3>
          <span>档案状态：<StatusTag status={form.status} /> <StatusTag status={form.insuranceStatus} /></span>
        </div>
        <div className="field-row">
          <div><label>姓名</label><input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label>年龄</label><input type="number" value={form.age ?? ''} onChange={(e) => set('age', +e.target.value)} /></div>
          <div><label>性别</label>
            <select value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
              <option value="">请选择</option><option>女</option><option>男</option>
            </select>
          </div>
          <div><label>联系电话</label><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div><label>居住地址</label><input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
          <div><label>到社区服务点距离（公里）</label><input type="number" step="0.1" value={form.distanceKm ?? 0} onChange={(e) => set('distanceKm', +e.target.value)} /></div>
        </div>
      </div>

      <div className="card">
        <h3>健康与安全</h3>
        <label>健康情况 <span style={{ color: 'var(--danger)' }}>*</span></label>
        <select value={form.health} onChange={(e) => set('health', e.target.value)}>
          <option>健康</option>
          <option>高血压（规律服药，病情稳定）</option>
          <option>糖尿病</option>
          <option>心脏病术后两年，不宜劳累</option>
          <option>腰腿疼，不宜久站</option>
        </select>
        <label>健康备注（用药、禁忌等）</label>
        <textarea value={form.healthNote || ''} onChange={(e) => set('healthNote', e.target.value)} />

        <label className="checkbox-row" style={{ display: 'flex' }}>
          <input type="checkbox" checked={!!form.familyAware} onChange={(e) => set('familyAware', e.target.checked)} />
          家属已知情我参与志愿服务
        </label>
        <label className="checkbox-row" style={{ display: 'flex' }}>
          <input type="checkbox" checked={!!form.familyConsentHigh} onChange={(e) => set('familyConsentHigh', e.target.checked)} />
          家属明确同意我参与高强度（高风险）服务
        </label>
        <div className="form-hint">高风险岗位必须同时具备有效保险和家属的明确同意。</div>

        <div className="field-row">
          <div>
            <label>保险状态 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select value={form.insuranceStatus} onChange={(e) => set('insuranceStatus', e.target.value)}>
              <option value="VALID">有效</option>
              <option value="EXPIRED">已过期</option>
              <option value="NONE">未投保</option>
            </select>
          </div>
          <div>
            <label>保险到期日</label>
            <input type="date" value={form.insuranceExpireDate || ''} onChange={(e) => set('insuranceExpireDate', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>擅长技能与可服务时间</h3>
        <label>擅长技能（可多选）</label>
        <MultiCheck options={SKILL_OPTIONS} selected={form.skills} onChange={(v) => set('skills', v)} />
        <label className="mt16">可服务时间（可多选）</label>
        <MultiCheck options={TIME_OPTIONS} selected={form.timePrefs} onChange={(v) => set('timePrefs', v)} />
      </div>

      <div className="card">
        <h3>紧急联系人</h3>
        <div className="field-row">
          <div><label>联系人与关系</label><input value={form.emergencyContactName || ''} onChange={(e) => set('emergencyContactName', e.target.value)} /></div>
          <div><label>联系电话</label><input value={form.emergencyContactPhone || ''} onChange={(e) => set('emergencyContactPhone', e.target.value)} /></div>
        </div>
      </div>

      <div className="card">
        <h3>培训记录</h3>
        {trainings.length === 0 && <div className="muted">暂无培训记录，请先参加岗前通用培训。</div>}
        {trainings.map((t) => (
          <div key={t.id} className="flex-between" style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
            <span>{t.course}</span>
            <span>{t.passed ? <span className="tag green">考核合格</span> : <span className="tag red">未通过</span>}
              <span className="muted small"> {new Date(t.trainedAt).toLocaleDateString('zh-CN')}</span>
            </span>
          </div>
        ))}
      </div>

      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <button onClick={save}>保存档案</button>
    </div>
  );
}
