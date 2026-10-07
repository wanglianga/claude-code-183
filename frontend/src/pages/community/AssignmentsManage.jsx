import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Empty, Modal, RiskTag, StatusTag } from '../../components';

const FILTERS = [
  ['', '全部'],
  ['RECOMMENDED', '待确认'],
  ['SCHEDULED', '已排班'],
  ['CHECKED_IN', '已签到'],
  ['COMPLETED', '已完成'],
  ['ABSENT', '缺勤'],
  ['CANCELLED', '已取消'],
];

export default function AssignmentsManage() {
  const [filter, setFilter] = useState('');
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm, setCompleteForm] = useState({ method: 'LEADER', proofNote: '', rating: 5 });

  async function load() {
    setList(await api(`/assignments/all${filter ? `?status=${filter}` : ''}`));
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [filter]);

  async function act(a, path, body, ok) {
    setErr(''); setMsg('');
    try {
      await api(`/assignments/${a.id}/${path}`, { method: 'POST', body: body || {} });
      setMsg(ok);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function submitComplete() {
    try {
      await api(`/assignments/${completeTarget.id}/complete`, {
        method: 'POST',
        body: { ...completeForm, rating: completeForm.rating ? +completeForm.rating : undefined },
      });
      setCompleteTarget(null);
      setMsg('服务已确认完成，积分已发放至志愿者账户。');
      await load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <h1 className="page-title">排班与服务确认</h1>
      <p className="page-sub">确认报名 → 服务日签到 → 完成服务（照片或负责人确认）→ 积分自动入账。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="btn-row" style={{ marginTop: 0 }}>
        {FILTERS.map(([v, l]) => (
          <button key={v} className={filter === v ? 'btn-sm' : 'btn-ghost btn-sm'} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="table-wrap mt16">
        <table>
          <thead>
            <tr>
              <th>志愿者</th><th>岗位</th><th>服务时间</th><th>风险</th><th>状态</th>
              <th>凭证/积分</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7}><Empty /></td></tr>}
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link to={`/c/team/${a.volunteerId}`}><strong>{a.volunteer?.name}</strong></Link>
                  <div className="small muted">{a.volunteer?.age} 岁 · {a.volunteer?.health}</div>
                </td>
                <td className="small">{a.job?.title}<div className="muted">{a.job?.location}</div></td>
                <td className="small">{a.job?.serviceDate}<br />{a.job?.startTime?.slice(0, 5)}-{a.job?.endTime?.slice(0, 5)}</td>
                <td><RiskTag level={a.job?.riskLevel} /></td>
                <td><StatusTag status={a.status} />{a.remark && <div className="small warning-line">{a.remark}</div>}</td>
                <td className="small">
                  {a.status === 'COMPLETED' ? (
                    <>
                      {a.completeMethod === 'PHOTO' ? '照片凭证' : '负责人确认'}：{a.confirmedBy}
                      <br />{a.actualHours}h · +{a.pointsAwarded} 分
                      {a.serviceRating && <> · ⭐{a.serviceRating}</>}
                    </>
                  ) : '-'}
                </td>
                <td className="small">
                  <div className="btn-row" style={{ margin: 0 }}>
                    {a.status === 'RECOMMENDED' && (
                      <button className="btn-sm" onClick={async () => {
                        try {
                          await api(`/jobs/${a.jobId}/schedule`, { method: 'POST', body: { volunteerId: a.volunteerId } });
                          setMsg('已确认排班。'); await load();
                        } catch (e) { setErr(e.message); }
                      }}>确认排班</button>
                    )}
                    {['SCHEDULED', 'RECOMMENDED'].includes(a.status) && (
                      <button className="btn-ghost btn-sm" onClick={() => act(a, 'checkin', null, '签到成功。')}>代签到</button>
                    )}
                    {a.status === 'CHECKED_IN' && (
                      <button className="btn-sm" onClick={() => { setCompleteTarget(a); setCompleteForm({ method: 'LEADER', proofNote: '', rating: 5 }); }}>
                        确认完成
                      </button>
                    )}
                    {['SCHEDULED', 'RECOMMENDED'].includes(a.status) && (
                      <button className="btn-danger btn-sm" onClick={() => {
                        const reason = prompt('取消原因', '岗位调整');
                        if (reason) act(a, 'cancel', { reason }, '排班已取消。');
                      }}>取消</button>
                    )}
                    {['CHECKED_IN', 'COMPLETED'].includes(a.status) && (
                      <button className="btn-warn btn-sm" onClick={() => {
                        const description = prompt('投诉内容');
                        if (description) {
                          const rating = prompt('本次服务评分（1-5，可留空）', '2');
                          act(a, 'complaint', { description, rating: rating ? +rating : undefined }, '投诉已登记并入档，建议安排关怀回访。');
                        }
                      }}>投诉登记</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {completeTarget && (
        <Modal title={`确认服务完成 - ${completeTarget.volunteer?.name} · ${completeTarget.job?.title}`} onClose={() => setCompleteTarget(null)}>
          <label>完成凭证</label>
          <select value={completeForm.method} onChange={(e) => setCompleteForm({ ...completeForm, method: e.target.value })}>
            <option value="LEADER">负责人现场确认</option>
            <option value="PHOTO">志愿者上传服务照片</option>
          </select>
          <label>{completeForm.method === 'PHOTO' ? '照片说明 / 链接（演示环境以文字代替图片）' : '确认说明'}</label>
          <textarea
            value={completeForm.proofNote}
            onChange={(e) => setCompleteForm({ ...completeForm, proofNote: e.target.value })}
            placeholder={completeForm.method === 'PHOTO' ? '如：已上传 3 张书屋整理现场照片' : '如：负责人张姐确认全程在岗'}
          />
          <label>服务评价（1-5 星，5 星有积分奖励）</label>
          <select value={completeForm.rating} onChange={(e) => setCompleteForm({ ...completeForm, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'⭐'.repeat(n)}（{n} 星）</option>)}
          </select>
          <div className="alert alert-info mt16">
            完成后将发放 {completeTarget.job?.basePoints} 积分{completeForm.rating >= 5 ? ` + ${Math.round(completeTarget.job?.basePoints * 0.2)} 好评奖励` : ''}。
          </div>
          <div className="btn-row">
            <button onClick={submitComplete}>确认完成并发放积分</button>
            <button className="btn-ghost" onClick={() => setCompleteTarget(null)}>取消</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
