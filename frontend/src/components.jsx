export function RiskTag({ level }) {
  const map = { LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险' };
  return <span className={`tag risk-${level}`}>{map[level] || level}</span>;
}

export function StatusTag({ status }) {
  const map = {
    RECOMMENDED: ['待确认', 'gray'],
    SCHEDULED: ['已排班', 'blue'],
    CHECKED_IN: ['已签到', 'amber'],
    COMPLETED: ['已完成', 'green'],
    ABSENT: ['缺勤', 'red'],
    CANCELLED: ['已取消', 'gray'],
    PENDING: ['待兑现', 'amber'],
    FULFILLED: ['已兑现', 'green'],
    FAILED_OUT_OF_STOCK: ['未兑现', 'red'],
    OPEN: ['待处置', 'red'],
    RESOLVED: ['已处置', 'green'],
    ACTIVE: ['在队', 'green'],
    PAUSED: ['已暂停', 'red'],
    VALID: ['保险有效', 'green'],
    EXPIRED: ['保险过期', 'red'],
    NONE: ['未投保', 'red'],
  };
  const [text, cls] = map[status] || [status, 'gray'];
  return <span className={`tag ${cls}`}>{text}</span>;
}

const INCIDENT_LABEL = {
  FEEL_UNWELL: '身体不适',
  ABSENT: '临时缺勤',
  RISK_UPGRADE: '岗位风险升级',
  COMPLAINT: '服务对象投诉',
  INSURANCE_EXPIRED: '保险过期',
  FAMILY_OBJECTION: '家属反对高强度服务',
  REWARD_OUT_OF_STOCK: '兑换库存不足',
};
export function incidentLabel(t) {
  return INCIDENT_LABEL[t] || t;
}

export function Modal({ title, onClose, children, width = 620 }) {
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="flex-between">
          <h3>{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose}>关闭</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ text = '暂无数据' }) {
  return <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>{text}</div>;
}

export function fmtDate(s) {
  return s || '-';
}
export function fmtDateTime(s) {
  if (!s) return '-';
  return new Date(s).toLocaleString('zh-CN', { hour12: false });
}
