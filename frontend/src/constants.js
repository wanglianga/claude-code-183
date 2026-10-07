// 共享常量与工具
export const CATEGORIES = ['图书整理', '文明劝导', '助餐引导', '儿童阅读陪伴', '邻里调解', '活动签到'];

export const SKILLS = CATEGORIES;

export const RISK = {
  low: { text: '低风险', color: 'green' },
  medium: { text: '中风险', color: 'orange' },
  high: { text: '高风险', color: 'red' },
};

export const HEALTH = {
  good: { text: '良好', color: 'green' },
  fair: { text: '一般', color: 'orange' },
  poor: { text: '较弱', color: 'red' },
};

export const FAMILY_CONSENT = {
  unknown: { text: '未确认', color: 'default' },
  approved: { text: '家属知情同意', color: 'green' },
  opposed: { text: '家属反对高强度', color: 'red' },
};

export const ASSIGN_STATUS = {
  assigned: { text: '已排班', color: 'blue' },
  checked_in: { text: '已签到', color: 'cyan' },
  completed: { text: '已完成', color: 'green' },
  absent: { text: '临时缺勤', color: 'orange' },
  cancelled: { text: '已取消', color: 'default' },
};

export const POSITION_STATUS = {
  open: { text: '报名中', color: 'green' },
  full: { text: '已满员', color: 'orange' },
  done: { text: '已结束', color: 'default' },
  cancelled: { text: '已取消', color: 'red' },
};

export const ARCHIVE_TYPE = {
  registration: { text: '报名登记', color: 'blue' },
  training: { text: '培训', color: 'purple' },
  insurance: { text: '保险', color: 'geekblue' },
  assignment: { text: '排班', color: 'cyan' },
  checkin: { text: '签到', color: 'blue' },
  service: { text: '服务完成', color: 'green' },
  absence: { text: '缺勤', color: 'orange' },
  cancel: { text: '取消', color: 'default' },
  points: { text: '积分', color: 'gold' },
  redemption: { text: '兑换', color: 'magenta' },
  complaint: { text: '投诉', color: 'red' },
  followup: { text: '关怀回访', color: 'volcano' },
  alert: { text: '风险提醒', color: 'red' },
};

export const TRIGGER_LABEL = {
  discomfort: '身体不适',
  absence: '临时缺勤',
  complaint: '投诉',
  risk_escalation: '风险升级',
  insurance_expired: '保险过期',
  family_opposition: '家属反对',
  manual: '主动回访',
};

export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const PERIODS = { am: '上午', pm: '下午', eve: '晚上' };

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function fmtSlots(slots) {
  if (!slots || !slots.length) return '未登记';
  return slots
    .map((s) => `${WEEKDAYS[(s.weekday || 1) - 1]}${(s.periods || []).map((p) => PERIODS[p]).join('/')}`)
    .join('；');
}

/** 读取文件为 base64 dataURL，限制 2MB */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('照片不能超过 2MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
