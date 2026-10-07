import { useEffect, useState } from 'react';
import { api } from '../../api';

const STAGE_COLOR = {
  register: '报名',
  training: '培训',
  schedule: '排班',
  checkin: '签到',
  service: '服务',
  points: '积分',
  redeem: '兑换',
  followup: '关怀回访',
  incident: '异常',
};

export default function MyTimeline() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    api('/volunteers/me/timeline').then(setEvents);
  }, []);

  if (!events) return <div className="card">加载中…</div>;

  return (
    <div>
      <h1 className="page-title">我的志愿历程</h1>
      <p className="page-sub">
        报名 → 培训 → 排班 → 签到 → 服务 → 积分 → 兑换 → 关怀回访，全部环节连续记录在同一条志愿档案中；
        如发生身体不适或投诉，可凭此还原全过程。
      </p>
      <div className="card">
        {events.length === 0 && <div className="muted">暂无历程记录</div>}
        <div className="timeline">
          {events.map((e, i) => (
            <div key={i} className={`ev ${e.stage === 'incident' ? 'incident' : e.stage === 'followup' ? 'followup' : ''}`}>
              <div className="ev-at">
                {new Date(e.at).toLocaleString('zh-CN', { hour12: false })} · <span className="tag">{STAGE_COLOR[e.stage] || e.stageLabel}</span>
              </div>
              <div className="ev-title">{e.title}</div>
              {e.detail && <div className="small muted">{e.detail}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
