import { useEffect, useState } from 'react';
import { api } from '../../api';
import { incidentLabel } from '../../components';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/stats/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="alert alert-error">{err}</div>;
  if (!d) return <div className="card">加载中…</div>;

  return (
    <div>
      <h1 className="page-title">社区看板</h1>
      <p className="page-sub">既看服务覆盖，也看队伍稳定性与安全边界：岗位是否适合、家属是否知情、保险是否有效、兑换是否兑现。</p>

      <h3>服务总览</h3>
      <div className="grid grid-4">
        <div className="stat"><div className="label">开放岗位</div><div className="value">{d.service.openJobs}</div><div className="hint">共发布 {d.service.totalJobs} 个</div></div>
        <div className="stat"><div className="label">完成服务人次</div><div className="value">{d.service.completedAssignments}</div></div>
        <div className="stat"><div className="label">累计服务时长</div><div className="value">{d.service.totalHours}</div><div className="hint">小时</div></div>
        <div className="stat warn"><div className="label">缺勤 / 取消</div><div className="value">{d.service.absent} / {d.service.cancelled}</div></div>
      </div>

      <h3 className="mt24">银龄队伍稳定性</h3>
      <div className="grid grid-4">
        <div className="stat"><div className="label">在队 / 暂停</div><div className="value">{d.stability.active} / {d.stability.paused}</div><div className="hint">共 {d.stability.total} 人</div></div>
        <div className="stat"><div className="label">在岗率</div><div className="value">{d.stability.retentionRate}%</div></div>
        <div className="stat"><div className="label">出勤率</div><div className="value">{d.stability.attendanceRate}%</div><div className="hint">完成 / (完成+缺勤)</div></div>
        <div className="stat"><div className="label">平均评价</div><div className="value">⭐ {d.stability.avgRating}</div></div>
      </div>
      {(d.stability.pauseReasons.feelUnwell + d.stability.pauseReasons.familyObjection > 0) && (
        <div className="alert alert-warn">
          当前有 {d.stability.pauseReasons.feelUnwell} 起因身体不适、{d.stability.pauseReasons.familyObjection} 起因家属反对处于待处置状态，请及时关怀回访。
        </div>
      )}

      <h3 className="mt24">服务覆盖</h3>
      <div className="grid grid-2">
        <div className="card">
          <h4>按岗位类别</h4>
          <div className="table-wrap">
            <table>
              <thead><tr><th>类别</th><th>岗位数</th><th>完成人次</th><th>服务时长</th></tr></thead>
              <tbody>
                {Object.entries(d.coverage.byCategory).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v.jobs}</td><td>{v.completed}</td><td>{Number(v.hours).toFixed(1)} h</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h4>按风险等级</h4>
          <div className="table-wrap">
            <table>
              <thead><tr><th>风险</th><th>在岗排班</th><th>已完成</th></tr></thead>
              <tbody>
                {Object.entries(d.coverage.byRisk).map(([k, v]) => (
                  <tr key={k}>
                    <td><span className={`tag risk-${k}`}>{k === 'LOW' ? '低' : k === 'MEDIUM' ? '中' : '高'}风险</span></td>
                    <td>{v.scheduled}</td><td>{v.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h3 className="mt24">安全边界</h3>
      <div className="grid grid-4">
        <div className="stat"><div className="label">健康良好 / 慢病 / 脆弱</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{d.safety.healthBrackets.FIT} / {d.safety.healthBrackets.CHRONIC} / {d.safety.healthBrackets.FRAGILE}</div>
        </div>
        <div className={d.safety.insuranceInvalid ? 'stat danger' : 'stat'}><div className="label">保险有效 / 失效</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{d.safety.insuranceValid} / {d.safety.insuranceInvalid}</div>
        </div>
        <div className="stat"><div className="label">家属知情 / 同意高强度</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{d.safety.familyAware} / {d.safety.familyConsentHigh}</div>
        </div>
        <div className={d.safety.openIncidents ? 'stat warn' : 'stat'}><div className="label">待处置异常</div>
          <div className="value">{d.safety.openIncidents}</div>
        </div>
      </div>
      <div className="card mt16">
        <h4>异常分布</h4>
        {Object.keys(d.safety.incidentsByType).length === 0 && <span className="muted">暂无异常</span>}
        {Object.entries(d.safety.incidentsByType).map(([k, v]) => (
          <span key={k} className="tag amber">{incidentLabel(k)}：{v}</span>
        ))}
      </div>

      <h3 className="mt24">积分与兑换兑现</h3>
      <div className="grid grid-4">
        <div className="stat"><div className="label">累计发放积分</div><div className="value">{d.rewards.totalPointsIssued}</div></div>
        <div className="stat"><div className="label">待兑换余额</div><div className="value">{d.rewards.outstandingPoints}</div></div>
        <div className="stat"><div className="label">兑换兑现率</div><div className="value">{d.rewards.redemptions.fulfillmentRate}%</div>
          <div className="hint">已兑现 {d.rewards.redemptions.fulfilled} / 待兑现 {d.rewards.redemptions.pending} / 未兑现 {d.rewards.redemptions.failed}</div></div>
        <div className={d.rewards.lowStockRewards.length ? 'stat warn' : 'stat'}><div className="label">低库存奖励</div>
          <div className="value">{d.rewards.lowStockRewards.length}</div></div>
      </div>
      {d.rewards.lowStockRewards.length > 0 && (
        <div className="alert alert-warn">
          库存预警：{d.rewards.lowStockRewards.map((r) => `${r.name}（剩 ${r.stock}）`).join('；')}
        </div>
      )}

      <h3 className="mt24">关怀回访覆盖</h3>
      <div className="grid grid-4">
        <div className="stat"><div className="label">回访总次数</div><div className="value">{d.followups.total}</div></div>
        <div className="stat"><div className="label">健康关怀</div><div className="value">{d.followups.healthFollowups}</div></div>
        <div className="stat"><div className="label">投诉回访</div><div className="value">{d.followups.complaintFollowups}</div></div>
        <div className={d.followups.uncoveredVolunteers ? 'stat warn' : 'stat'}><div className="label">有服务但未回访</div>
          <div className="value">{d.followups.uncoveredVolunteers}</div><div className="hint">人</div></div>
      </div>
    </div>
  );
}
