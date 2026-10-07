import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/* ================= 用户（登录账号） ================= */
export enum UserRole {
  STAFF = 'staff', // 社区工作人员
  VOLUNTEER = 'volunteer', // 银龄志愿者
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: UserRole.VOLUNTEER })
  role: UserRole;

  @Column({ nullable: true })
  volunteerId: number; // 志愿者账号关联的档案

  @CreateDateColumn()
  createdAt: Date;
}

/* ================= 志愿者档案（报名登记） ================= */
export enum HealthStatus {
  GOOD = 'good', // 良好
  FAIR = 'fair', // 一般（有慢性病但稳定）
  POOR = 'poor', // 较弱（需重点关注）
}

export enum FamilyConsent {
  UNKNOWN = 'unknown',
  APPROVED = 'approved', // 家属知情并同意
  OPPOSED = 'opposed', // 家属反对高强度服务
}

export enum VolunteerStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended', // 暂停服务（身体不适/家属反对等）
}

@Entity('volunteers')
export class Volunteer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: '女' })
  gender: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column()
  phone: string;

  @Column({ default: '' })
  address: string;

  // 可接受的最远服务距离（公里）
  @Column({ type: 'float', default: 3 })
  maxDistanceKm: number;

  @Column({ type: 'varchar', default: HealthStatus.GOOD })
  healthStatus: HealthStatus;

  @Column({ type: 'text', default: '' })
  healthNotes: string; // 健康情况说明（慢病等）

  @Column({ type: 'jsonb', default: [] })
  skills: string[]; // 擅长技能：图书整理/文明劝导/助餐引导/儿童阅读陪伴/邻里调解/活动签到

  // 可服务时间：[{ weekday: 1-7, periods: ['am','pm','eve'] }]
  @Column({ type: 'jsonb', default: [] })
  availableSlots: { weekday: number; periods: string[] }[];

  @Column({ default: '' })
  emergencyContactName: string;

  @Column({ default: '' })
  emergencyContactPhone: string;

  @Column({ default: '' })
  emergencyContactRelation: string;

  @Column({ default: false })
  familyNotifyRequired: boolean; // 是否需要家属知情

  @Column({ type: 'varchar', default: FamilyConsent.UNKNOWN })
  familyConsent: FamilyConsent; // 家属对高强度服务的态度

  @Column({ type: 'varchar', default: VolunteerStatus.ACTIVE })
  status: VolunteerStatus;

  @Column({ type: 'int', default: 0 })
  pointsBalance: number; // 积分余额（冗余，流水为准）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/* ================= 培训记录 ================= */
@Entity('training_records')
export class TrainingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column()
  title: string; // 培训名称，如 急救基础/儿童陪伴/调解技巧/食品安全

  @Column({ type: 'date' })
  trainedAt: string;

  @Column({ default: false })
  qualified: boolean; // 是否考核合格

  @Column({ type: 'date', nullable: true })
  expiresAt: string; // 合格证有效期

  @Column({ type: 'text', default: '' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}

/* ================= 保险状态 ================= */
@Entity('insurances')
export class Insurance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column()
  provider: string; // 保险公司

  @Column()
  policyNo: string; // 保单号

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ default: '' })
  coverage: string; // 保障范围

  @CreateDateColumn()
  createdAt: Date;
}

/* ================= 服务岗位 ================= */
export enum PositionCategory {
  BOOK = '图书整理',
  CIVIL = '文明劝导',
  MEAL = '助餐引导',
  READING = '儿童阅读陪伴',
  MEDIATION = '邻里调解',
  CHECKIN = '活动签到',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum PositionStatus {
  OPEN = 'open',
  FULL = 'full',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar' })
  category: PositionCategory;

  @Column()
  location: string; // 服务地点

  @Column({ type: 'float', default: 1 })
  distanceKm: number; // 距社区中心距离（公里）

  @Column({ type: 'date' })
  serviceDate: string;

  @Column()
  startTime: string; // HH:mm

  @Column()
  endTime: string;

  @Column({ type: 'float' })
  durationHours: number; // 时长

  @Column({ type: 'varchar', default: RiskLevel.LOW })
  riskLevel: RiskLevel; // 风险等级

  @Column({ type: 'int', default: 1 })
  headcount: number; // 需求人数

  @Column({ type: 'int', default: 10 })
  pointsPerHour: number; // 积分规则：每小时积分

  @Column({ type: 'jsonb', default: [] })
  requiredSkills: string[];

  @Column({ default: '' })
  requiredTraining: string; // 需要的培训名称（空=不要求）

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', default: PositionStatus.OPEN })
  status: PositionStatus;

  @CreateDateColumn()
  createdAt: Date;
}

/* ================= 排班 / 服务记录 ================= */
export enum AssignmentStatus {
  ASSIGNED = 'assigned', // 已排班
  CHECKED_IN = 'checked_in', // 已签到
  COMPLETED = 'completed', // 已完成（积分已入账）
  ABSENT = 'absent', // 临时缺勤
  CANCELLED = 'cancelled', // 取消（身体不适/家属反对/风险升级等）
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  positionId: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column({ type: 'varchar', default: AssignmentStatus.ASSIGNED })
  status: AssignmentStatus;

  @Column({ type: 'float', nullable: true })
  recommendScore: number; // 排班推荐得分快照

  @Column({ type: 'text', default: '' })
  assignNote: string; // 排班理由

  @Column({ type: 'timestamp', nullable: true })
  checkInAt: Date;

  @Column({ type: 'text', default: '' })
  checkInPhoto: string; // 签到照片（base64）

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', default: '' })
  servicePhoto: string; // 服务照片（base64）

  @Column({ default: '' })
  confirmedBy: string; // 负责人确认人

  @Column({ type: 'int', nullable: true })
  rating: number; // 服务对象/负责人评价 1-5

  @Column({ type: 'text', default: '' })
  reviewNote: string;

  @Column({ type: 'int', default: 0 })
  pointsAwarded: number;

  @Column({ type: 'text', default: '' })
  cancelReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/* ================= 积分流水 ================= */
export enum PointsTxType {
  EARN = 'earn', // 服务获得
  REDEEM = 'redeem', // 兑换扣减
  ADJUST = 'adjust', // 人工调整
}

@Entity('points_transactions')
export class PointsTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column({ type: 'varchar' })
  type: PointsTxType;

  @Column({ type: 'int' })
  points: number; // 正=入账 负=扣减

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ default: '' })
  refType: string; // assignment / redemption / manual

  @Column({ nullable: true })
  refId: number;

  @Column({ type: 'text', default: '' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}

/* ================= 积分兑换商品 ================= */
export enum RedemptionCategory {
  MEAL = '食堂餐券',
  HAIRCUT = '理发券',
  HEALTH = '体检优惠',
  HONOR = '公益荣誉',
}

@Entity('redemption_items')
export class RedemptionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  category: RedemptionCategory;

  @Column({ type: 'int' })
  pointsCost: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ default: true })
  active: boolean;
}

export enum RedemptionStatus {
  FULFILLED = 'fulfilled', // 已兑现
  FAILED = 'failed', // 失败（如库存不足）
}

@Entity('redemption_orders')
export class RedemptionOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column()
  itemId: number;

  @Column()
  itemName: string;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'varchar', default: RedemptionStatus.FULFILLED })
  status: RedemptionStatus;

  @Column({ type: 'text', default: '' })
  failReason: string;

  @CreateDateColumn()
  createdAt: Date;
}

/* ================= 服务对象投诉 ================= */
export enum ComplaintStatus {
  OPEN = 'open',
  PROCESSING = 'processing',
  RESOLVED = 'resolved',
}

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column({ nullable: true })
  assignmentId: number;

  @Column()
  complainant: string; // 投诉人（服务对象）

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: ComplaintStatus.OPEN })
  status: ComplaintStatus;

  @Column({ type: 'text', default: '' })
  handleNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/* ================= 关怀回访 ================= */
export enum FollowUpTrigger {
  DISCOMFORT = 'discomfort', // 身体不适
  ABSENCE = 'absence', // 临时缺勤
  COMPLAINT = 'complaint', // 投诉
  RISK_ESCALATION = 'risk_escalation', // 岗位风险升级
  INSURANCE_EXPIRED = 'insurance_expired', // 保险过期
  FAMILY_OPPOSITION = 'family_opposition', // 家属反对
  MANUAL = 'manual',
}

@Entity('care_follow_ups')
export class CareFollowUp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column({ nullable: true })
  assignmentId: number;

  @Column({ type: 'varchar' })
  trigger: FollowUpTrigger;

  @Column({ type: 'text' })
  content: string; // 回访内容

  @Column({ type: 'text', default: '' })
  result: string; // 回访结果

  @Column({ default: '' })
  staffName: string; // 回访人

  @Column({ default: false })
  done: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/* ================= 志愿档案事件（统一时间线） ================= */
export enum ArchiveEventType {
  REGISTRATION = 'registration', // 报名登记
  TRAINING = 'training', // 培训
  INSURANCE = 'insurance', // 保险
  ASSIGNMENT = 'assignment', // 排班
  CHECKIN = 'checkin', // 签到
  SERVICE = 'service', // 服务完成
  ABSENCE = 'absence', // 缺勤
  CANCEL = 'cancel', // 取消（身体不适等）
  POINTS = 'points', // 积分变动
  REDEMPTION = 'redemption', // 兑换
  COMPLAINT = 'complaint', // 投诉
  FOLLOWUP = 'followup', // 关怀回访
  ALERT = 'alert', // 风险提醒（保险过期/风险升级/家属反对）
}

@Entity('archive_events')
export class ArchiveEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  volunteerId: number;

  @Column({ type: 'varchar' })
  type: ArchiveEventType;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  detail: string;

  @Column({ nullable: true })
  refId: number; // 关联业务 id

  @CreateDateColumn()
  createdAt: Date;
}
