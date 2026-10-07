import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Empty, fmtDateTime, RiskTag, StatusTag } from '../../components';

const CAN_LABEL = {
  SCHEDULED: '已排班，等待服务日签到',
  RECOMMENDED: '已报名，等待社区确认排班',
  CHECKED_IN: '今天已签到，服务完成后由社区确认',
  COMPLETED: '服务已完成',
  ABSENT: '已登记缺勤',
  CANCELLED: '排班已取消',
};

export default function MyAssignments() {
  const { refreshProfile } = useAuth();
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setList(await api('/assignments'));
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function act(a, path, body, ok) {
    setMsg(''); setErr('');
    try {
      const url = path.startsWith('/') ? path : `/assignments/${a.id}/${path}`;
      await api(url, { method: 'POST', body: body || {} });
      setMsg(ok);
      await load();
      await refreshProfile();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1 className="page-title">我的排班与服务</h1>
      <p className="page-sub">服务当天先签到；若身体不适请及时登记，平台会自动暂停档案并通知社区关怀回访。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      {list.length === 0 && <Empty text="您还没有排班记录，可去岗位大厅报名" />}
      <div className="grid grid-2">
        {list.map((a) => (
          <div className="card" key={a.id}>
            <div className="flex-between">
              <h3>{a.job?.title}</h3>
              <StatusTag status={a.status} />
            </div>
            <div className="small muted">
              {a.job?.serviceDate} {a.job?.startTime?.slice(0, 5)}-{a.job?.endTime?.slice(0, 5)} · 📍{a.job?.location} · <RiskTag level={a.job?.riskLevel} />
            </div>
            <div className="mt8">{CAN_LABEL[a.status]}</div>
            {a.status === 'COMPLETED' && (
              <div className="small mt8">
                完成于 {fmtDateTime(a.completedAt)} · {a.actualHours} 小时 · 积分 +{a.pointsAwarded}
                {a.serviceRating && <> · 评价 {a.serviceRating} 星</>}
                <br />凭证：{a.completeMethod === 'PHOTO' ? '服务照片' : '负责人确认'} {a.proofNote ? `（${a.proofNote}）` : ''}
              </div>
            )}
            {a.remark && <div className="small warning-line mt8">备注：{a.remark}</div>}
            <div className="btn-row">
              {(a.status === 'SCHEDULED' || a.status === 'RECOMMENDED') && (
                <button className="btn-sm" onClick={() => act(a, 'checkin', null, '签到成功！请注意量力而行、安全第一。')}>
                  服务当天签到
                </button>
              )}
              {(a.status === 'SCHEDULED' || a.status === 'RECOMMENDED') && (
                <button className="btn-ghost btn-sm" onClick={() => {
                  const reason = prompt('请简单说明缺勤原因（可留空）', '临时有事');
                  if (reason !== null) act(a, 'absent', { reason }, '已登记临时缺勤。');
                }}>临时缺勤</button>
              )}
              {['SCHEDULED', 'RECOMMENDED', 'CHECKED_IN'].includes(a.status) && (
                <button className="btn-danger btn-sm" onClick={() => {
                  const desc = prompt('请描述身体不适的情况（将通知社区和紧急联系人）', '服务时突感头晕不适');
                  if (desc) act(a, '/incidents/feel-unwell', { assignmentId: a.id, description: desc }, '已登记身体不适，档案已暂停，社区将尽快联系您和家属。');
                }}>身体不适</button>
              )}
              {['SCHEDULED', 'RECOMMENDED'].includes(a.status) && a.job?.riskLevel !== 'LOW' && (
                <button className="btn-warn btn-sm" onClick={() => {
                  const desc = prompt('请说明家属意见', '家属不同意我参加强度较大的服务');
                  if (desc) act(a, '/incidents/family-objection', { assignmentId: a.id, description: desc }, '已登记家属意见，高风险排班已取消。');
                }}>家属反对</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
