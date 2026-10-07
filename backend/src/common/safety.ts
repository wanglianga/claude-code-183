import { VolunteerProfile } from '../entities/volunteer-profile.entity';

/** 高危健康关键词：带此类情况的银龄志愿者只建议 LOW 岗位 */
export const HIGH_RISK_HEALTH = ['心脏病', '严重', '术后', '晕厥', '心梗', '脑梗'];
/** 需注意的慢病：不安排 HIGH，MEDIUM 需家属知情 */
export const MID_RISK_HEALTH = ['高血压', '糖尿病', '冠心', '关节', '腰腿', '哮喘'];

export type HealthBracket = 'FIT' | 'CHRONIC' | 'FRAGILE';

export function healthBracket(health: string): HealthBracket {
  const h = health || '';
  if (HIGH_RISK_HEALTH.some((k) => h.includes(k))) return 'FRAGILE';
  if (MID_RISK_HEALTH.some((k) => h.includes(k))) return 'CHRONIC';
  return 'FIT';
}

/** 保险今天是否仍有效 */
export function insuranceValid(
  p: Pick<VolunteerProfile, 'insuranceStatus' | 'insuranceExpireDate'>,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  if (p.insuranceStatus !== 'VALID') return false;
  if (!p.insuranceExpireDate) return false;
  return p.insuranceExpireDate >= today;
}

/** 健康状况允许承担的最高风险等级 */
export function maxAllowedRisk(bracket: HealthBracket): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (bracket === 'FRAGILE') return 'LOW';
  if (bracket === 'CHRONIC') return 'MEDIUM';
  return 'HIGH';
}

export function riskRank(r: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  return r === 'LOW' ? 1 : r === 'MEDIUM' ? 2 : 3;
}

/** 风险升级后的岗位有效风险等级 */
export function escalateRisk(
  r: 'LOW' | 'MEDIUM' | 'HIGH',
  escalated: boolean,
): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!escalated) return r;
  if (r === 'LOW') return 'MEDIUM';
  return 'HIGH';
}

/** 高风险岗位必须家属明确同意；慢病志愿者承担中风险需家属知情 */
export function familyGate(
  bracket: HealthBracket,
  risk: 'LOW' | 'MEDIUM' | 'HIGH',
  familyAware: boolean,
  familyConsentHigh: boolean,
): boolean {
  if (risk === 'HIGH') return familyConsentHigh;
  if (risk === 'MEDIUM' && bracket === 'CHRONIC') return familyAware;
  return true;
}
